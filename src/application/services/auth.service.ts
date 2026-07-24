import { IUserRepo } from "../contracts/user-repo.contract.js";
import { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import { IHashUtil } from "../../shared/contracts/hash-util.contract.js";
import { ITokenHashUtil } from "../../shared/contracts/token-hash-util.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

const ACCESS_TOKEN_EXPIRES_IN = 5;
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7;

export const createAuthService = (
  findUserByEmail: IUserRepo["findUserByEmail"],
  createUser: IUserRepo["createUser"],
  signJwt: IJwtUtil["signJwt"],
  hashUtil: IHashUtil,
  updateRefreshToken: IUserRepo["updateRefreshToken"],
  findUserById: IUserRepo["findUserById"],
  verifyJwt: IJwtUtil["verifyJwt"],
  tokenHashUtil: ITokenHashUtil,
  createUserWithGoogle: IUserRepo["createUserWithGoogle"],
  findUserByGoogleId: IUserRepo["findUserByGoogleId"],
  linkGoogleId: IUserRepo["linkGoogleId"],
) => {
  const signIn = async (params: { email: string; password: string }) => {
    const { email, password } = params;

    const foundUser = await findUserByEmail(email);
    if (foundUser == null || foundUser.password == null) {
      throw new BusinessException("이메일 또는 비밀번호가 일치하지 않습니다");
    }

    const isPasswordValid = await hashUtil.compare({
      password: password,
      hashedPassword: foundUser.password,
    });
    if (!isPasswordValid) {
      throw new BusinessException("이메일 또는 비밀번호가 일치하지 않습니다");
    }

    // 액세스 토큰과 리프레시 토큰을 각각 발급
    const accessToken = signJwt({
      data: { userId: foundUser.id },
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = signJwt({
      data: { userId: foundUser.id },
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // 발급한 리프레시 토큰을 해시해서 사용자 레코드에 저장
    await updateRefreshToken({
      userId: foundUser.id,
      refreshToken: tokenHashUtil.hash(refreshToken),
    });

    return { accessToken, refreshToken };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    username: string;
  }) => {
    const { email, password, username } = params;

    // 트래픽이 적은 경우에만 방어가 가능합니다.
    const foundUser = await findUserByEmail(email);
    if (foundUser !== null) {
      throw new BusinessException("계정이 이미 존재합니다");
    }

    const hashedPassword = await hashUtil.hash({
      password,
      saltRounds: 10,
    });

    try {
      await createUser({
        email,
        password: hashedPassword,
        username,
      });
    } catch (err) {
      if (err instanceof TechnicalException) {
        if (err.code === TechnicalExceptionCode.EMAIL_DUPLICATED) {
          throw new BusinessException("계정이 이미 존재합니다");
        }
      }

      throw err;
    }
  };

  const signOut = async (params: { userId: number }) => {
    const { userId } = params;

    // 저장된 리프레시 토큰을 삭제해서 세션을 종료
    try {
      await updateRefreshToken({ userId, refreshToken: null });
    } catch (err) {
      throw new BusinessException(
        "로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  };

  const refresh = async (params: { refreshToken: string }) => {
    const { refreshToken } = params;

    // 리프레시 토큰을 검증해서 사용자 식별자를 추출
    let decoded: { userId: number };
    try {
      decoded = verifyJwt(refreshToken) as { userId: number };
    } catch (err) {
      if (err instanceof TechnicalException) {
        if (err.code === TechnicalExceptionCode.JWT_VERIFY_FAILED) {
          throw new BusinessException("권한이 없습니다.");
        }
        if (err.code === TechnicalExceptionCode.TOKEN_EXPIRED) {
          throw new BusinessException(
            "세션이 삭제되었습니다. 다시 로그인 해주세요.",
          );
        }
      }
      throw err;
    }

    // 토큰에 담긴 사용자 조회
    const foundUser = await findUserById(decoded.userId);
    if (foundUser == null) {
      throw new BusinessException("사용자를 찾을 수 없습니다");
    }

    // 저장된 리프레시 토큰 해시와 다르면 탈취/재사용으로 간주하고 세션을 강제 종료
    const isRefreshTokenValid =
      foundUser.refreshToken != null &&
      tokenHashUtil.compare({
        token: refreshToken,
        hashedToken: foundUser.refreshToken,
      });
    if (!isRefreshTokenValid) {
      await updateRefreshToken({ userId: foundUser.id, refreshToken: null });
      throw new BusinessException("권한이 없습니다.");
    }

    // 새로운 액세스 토큰과 리프레시 토큰을 각각 발급
    const accessToken = signJwt({
      data: { userId: foundUser.id },
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const newRefreshToken = signJwt({
      data: { userId: foundUser.id },
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // 발급한 리프레시 토큰을 해시해서 사용자 레코드에 갱신
    await updateRefreshToken({
      userId: foundUser.id,
      refreshToken: tokenHashUtil.hash(newRefreshToken),
    });

    return { accessToken, refreshToken: newRefreshToken };
  };

  const googleSignIn = async (params: {
    googleId: string;
    email: string;
    username: string;
    emailVerified: boolean;
  }) => {
    const { googleId, email, username, emailVerified } = params;

    // 이미 googleId로 가입된 사용자면 새로 만들지 않고 그대로 로그인 처리
    let user = await findUserByGoogleId(googleId);

    if (user == null) {
      // 같은 이메일로 가입된 기존 계정이 있는지 확인
      const foundUserByEmail = await findUserByEmail(email);
      if (foundUserByEmail != null) {
        // 구글에서 이메일 인증이 확인된 경우에만 기존 계정에 연동
        if (!emailVerified) {
          throw new BusinessException(
            "이메일 인증이 확인되지 않아 계정을 연동할 수 없습니다.",
          );
        }
        await linkGoogleId({ userId: foundUserByEmail.id, googleId });
        user = foundUserByEmail;
      } else {
        // 가입 이력이 없으면 구글 정보로 신규 가입
        user = await createUserWithGoogle({ googleId, email, username });
      }
    }

    // 액세스 토큰과 리프레시 토큰을 각각 발급
    const accessToken = signJwt({
      data: { userId: user.id },
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = signJwt({
      data: { userId: user.id },
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    // 발급한 리프레시 토큰을 해시해서 사용자 레코드에 저장
    await updateRefreshToken({
      userId: user.id,
      refreshToken: tokenHashUtil.hash(refreshToken),
    });

    return { accessToken, refreshToken };
  };

  return { signIn, signUp, signOut, refresh, googleSignIn };
};

export type AuthServiceType = ReturnType<typeof createAuthService>;
