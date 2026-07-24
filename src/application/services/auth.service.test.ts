import { jest, describe, test, expect } from "@jest/globals";
import { createAuthService } from "./auth.service.js";
import type { IUserRepo } from "../contracts/user-repo.contract.js";
import type { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import type { IHashUtil } from "../../shared/contracts/hash-util.contract.js";
import type { ITokenHashUtil } from "../../shared/contracts/token-hash-util.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

// 매 테스트마다 반복되던 빈 mock 선언을 한 곳에서 만들어 재사용
const createFakeAuthServiceDeps = () => ({
  findUserByEmail: jest.fn<IUserRepo["findUserByEmail"]>(),
  createUser: jest.fn<IUserRepo["createUser"]>(),
  signJwt: jest.fn<IJwtUtil["signJwt"]>(),
  hashUtil: {
    hash: jest.fn<IHashUtil["hash"]>(),
    compare: jest.fn<IHashUtil["compare"]>(),
  },
  updateRefreshToken: jest.fn<IUserRepo["updateRefreshToken"]>(),
  findUserById: jest.fn<IUserRepo["findUserById"]>(),
  verifyJwt: jest.fn<IJwtUtil["verifyJwt"]>(),
  tokenHashUtil: {
    hash: jest.fn<ITokenHashUtil["hash"]>(),
    compare: jest.fn<ITokenHashUtil["compare"]>(),
  },
  createUserWithGoogle: jest.fn<IUserRepo["createUserWithGoogle"]>(),
  findUserByGoogleId: jest.fn<IUserRepo["findUserByGoogleId"]>(),
  linkGoogleId: jest.fn<IUserRepo["linkGoogleId"]>(),
});

// fake 세트를 createAuthService의 위치 인자 순서에 맞춰 조립
const createAuthServiceWithFakes = (
  fakes: ReturnType<typeof createFakeAuthServiceDeps>,
) =>
  createAuthService(
    fakes.findUserByEmail,
    fakes.createUser,
    fakes.signJwt,
    fakes.hashUtil,
    fakes.updateRefreshToken,
    fakes.findUserById,
    fakes.verifyJwt,
    fakes.tokenHashUtil,
    fakes.createUserWithGoogle,
    fakes.findUserByGoogleId,
    fakes.linkGoogleId,
  );

describe("로그인", () => {
  test("이메일과 비밀번호가 일치하면 액세스 토큰과 리프레시 토큰을 반환하고 리프레시 토큰을 저장한다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "asd@asd.com",
      password: "hashed_password",
      username: "nick",
      googleId: null,
      refreshToken: null,
    };
    const fakeAccessToken = "fake-access-token";
    const fakeRefreshToken = "fake-refresh-token";
    const fakeHashedRefreshToken = "hashed-fake-refresh-token";

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserByEmail.mockResolvedValue(fakeUser);
    fakes.signJwt
      .mockReturnValueOnce(fakeAccessToken)
      .mockReturnValueOnce(fakeRefreshToken);
    fakes.hashUtil.compare.mockResolvedValue(true);
    fakes.tokenHashUtil.hash.mockReturnValue(fakeHashedRefreshToken);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { signIn: signInService } = createAuthServiceWithFakes(fakes);
    const result = await signInService({
      email: "asd@asd.com",
      password: "1234",
    });

    // 검증 결과가 예상과 같은지 확인
    expect(result).toEqual({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
    });
    expect(fakes.findUserByEmail).toHaveBeenCalledWith("asd@asd.com");
    expect(fakes.hashUtil.compare).toHaveBeenCalledWith({
      password: "1234",
      hashedPassword: "hashed_password",
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(1, {
      data: { userId: fakeUser.id },
      expiresIn: 5,
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(2, {
      data: { userId: fakeUser.id },
      expiresIn: 604800,
    });
    expect(fakes.tokenHashUtil.hash).toHaveBeenCalledWith(fakeRefreshToken);
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: fakeHashedRefreshToken,
    });
  });
});

describe("회원가입", () => {});

describe("구글 로그인", () => {
  test("가입 이력이 없는 사용자가 구글 인증에 성공하면 신규 가입시키고 토큰을 발급한다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "google@test.com",
      password: null,
      username: "google_user",
      googleId: "google-sub-123",
      refreshToken: null,
    };
    const fakeAccessToken = "fake-access-token";
    const fakeRefreshToken = "fake-refresh-token";
    const fakeHashedRefreshToken = "hashed-fake-refresh-token";

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserByGoogleId.mockResolvedValue(null);
    fakes.findUserByEmail.mockResolvedValue(null);
    fakes.createUserWithGoogle.mockResolvedValue(fakeUser);
    fakes.signJwt
      .mockReturnValueOnce(fakeAccessToken)
      .mockReturnValueOnce(fakeRefreshToken);
    fakes.tokenHashUtil.hash.mockReturnValue(fakeHashedRefreshToken);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { googleSignIn: googleSignInService } =
      createAuthServiceWithFakes(fakes);
    const result = await googleSignInService({
      googleId: "google-sub-123",
      email: "google@test.com",
      username: "google_user",
      emailVerified: true,
    });

    // 검증 결과가 예상과 같은지 확인
    expect(result).toEqual({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
    });
    expect(fakes.createUserWithGoogle).toHaveBeenCalledWith({
      googleId: "google-sub-123",
      email: "google@test.com",
      username: "google_user",
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(1, {
      data: { userId: fakeUser.id },
      expiresIn: 5,
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(2, {
      data: { userId: fakeUser.id },
      expiresIn: 604800,
    });
    expect(fakes.tokenHashUtil.hash).toHaveBeenCalledWith(fakeRefreshToken);
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: fakeHashedRefreshToken,
    });
  });

  test("이미 googleId로 가입된 사용자가 재로그인하면 신규 가입 없이 토큰만 발급한다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "google@test.com",
      password: null,
      username: "google_user",
      googleId: "google-sub-123",
      refreshToken: null,
    };
    const fakeAccessToken = "fake-access-token";
    const fakeRefreshToken = "fake-refresh-token";
    const fakeHashedRefreshToken = "hashed-fake-refresh-token";

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserByGoogleId.mockResolvedValue(fakeUser);
    fakes.signJwt
      .mockReturnValueOnce(fakeAccessToken)
      .mockReturnValueOnce(fakeRefreshToken);
    fakes.tokenHashUtil.hash.mockReturnValue(fakeHashedRefreshToken);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { googleSignIn: googleSignInService } =
      createAuthServiceWithFakes(fakes);
    const result = await googleSignInService({
      googleId: "google-sub-123",
      email: "google@test.com",
      username: "google_user",
      emailVerified: true,
    });

    // 검증 결과가 예상과 같은지 확인
    expect(result).toEqual({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
    });
    expect(fakes.findUserByGoogleId).toHaveBeenCalledWith("google-sub-123");
    expect(fakes.createUserWithGoogle).not.toHaveBeenCalled();
    expect(fakes.findUserByEmail).not.toHaveBeenCalled();
    expect(fakes.linkGoogleId).not.toHaveBeenCalled();
    expect(fakes.signJwt).toHaveBeenNthCalledWith(1, {
      data: { userId: fakeUser.id },
      expiresIn: 5,
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(2, {
      data: { userId: fakeUser.id },
      expiresIn: 604800,
    });
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: fakeHashedRefreshToken,
    });
  });

  test("이메일은 같지만 googleId가 없는 사용자가 인증된 이메일로 구글 로그인하면 계정을 연동하고 토큰을 발급한다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "asd@asd.com",
      password: "hashed_password",
      username: "nick",
      googleId: null,
      refreshToken: null,
    };
    const fakeAccessToken = "fake-access-token";
    const fakeRefreshToken = "fake-refresh-token";
    const fakeHashedRefreshToken = "hashed-fake-refresh-token";

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserByGoogleId.mockResolvedValue(null);
    fakes.findUserByEmail.mockResolvedValue(fakeUser);
    fakes.signJwt
      .mockReturnValueOnce(fakeAccessToken)
      .mockReturnValueOnce(fakeRefreshToken);
    fakes.tokenHashUtil.hash.mockReturnValue(fakeHashedRefreshToken);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { googleSignIn: googleSignInService } =
      createAuthServiceWithFakes(fakes);
    const result = await googleSignInService({
      googleId: "google-sub-123",
      email: "asd@asd.com",
      username: "nick",
      emailVerified: true,
    });

    // 검증 결과가 예상과 같은지 확인
    expect(result).toEqual({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
    });
    expect(fakes.linkGoogleId).toHaveBeenCalledWith({
      userId: fakeUser.id,
      googleId: "google-sub-123",
    });
    expect(fakes.createUserWithGoogle).not.toHaveBeenCalled();
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: fakeHashedRefreshToken,
    });
  });

  test("이메일은 같지만 구글에서 이메일 인증이 확인되지 않으면 계정을 연동하지 않고 에러를 던진다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "asd@asd.com",
      password: "hashed_password",
      username: "nick",
      googleId: null,
      refreshToken: null,
    };

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserByGoogleId.mockResolvedValue(null);
    fakes.findUserByEmail.mockResolvedValue(fakeUser);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { googleSignIn: googleSignInService } =
      createAuthServiceWithFakes(fakes);

    // 검증 결과가 예상과 같은지 확인
    await expect(
      googleSignInService({
        googleId: "google-sub-123",
        email: "asd@asd.com",
        username: "nick",
        emailVerified: false,
      }),
    ).rejects.toThrow(BusinessException);
    expect(fakes.linkGoogleId).not.toHaveBeenCalled();
    expect(fakes.createUserWithGoogle).not.toHaveBeenCalled();
    expect(fakes.signJwt).not.toHaveBeenCalled();
    expect(fakes.updateRefreshToken).not.toHaveBeenCalled();
  });
});

describe("로그아웃", () => {
  test("사용자 ID가 주어지면 저장된 리프레시 토큰을 삭제한다", async () => {
    // 가짜 데이터 준비
    const fakes = createFakeAuthServiceDeps();

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { signOut: signOutService } = createAuthServiceWithFakes(fakes);
    await signOutService({ userId: 1 });

    // 검증 결과가 예상과 같은지 확인
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: 1,
      refreshToken: null,
    });
  });

  test("리프레시 토큰 삭제에 실패하면 로그아웃 실패를 알리는 에러를 던진다", async () => {
    // 가짜 데이터 준비
    const fakes = createFakeAuthServiceDeps();
    fakes.updateRefreshToken.mockRejectedValue(new Error("DB 연결 실패"));

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { signOut: signOutService } = createAuthServiceWithFakes(fakes);

    // 검증 결과가 예상과 같은지 확인
    await expect(signOutService({ userId: 1 })).rejects.toThrow(
      "로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.",
    );
  });

  test("이미 로그아웃된 사용자가 다시 로그아웃 요청을 해도 에러 없이 정상 처리된다", async () => {
    // 가짜 데이터 준비
    const fakes = createFakeAuthServiceDeps();

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { signOut: signOutService } = createAuthServiceWithFakes(fakes);
    await signOutService({ userId: 1 });
    await signOutService({ userId: 1 });

    // 검증 결과가 예상과 같은지 확인
    expect(fakes.updateRefreshToken).toHaveBeenCalledTimes(2);
    expect(fakes.updateRefreshToken).toHaveBeenNthCalledWith(2, {
      userId: 1,
      refreshToken: null,
    });
  });
});

describe("토큰 재발급", () => {
  test("유효한 리프레시 토큰이면 새로운 액세스 토큰과 리프레시 토큰을 반환하고 저장한다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "asd@asd.com",
      password: "hashed_password",
      username: "nick",
      googleId: null,
      refreshToken: "hashed-old-refresh-token",
    };
    const fakeNewAccessToken = "new-access-token";
    const fakeNewRefreshToken = "new-refresh-token";
    const fakeHashedNewRefreshToken = "hashed-new-refresh-token";

    const fakes = createFakeAuthServiceDeps();
    fakes.signJwt
      .mockReturnValueOnce(fakeNewAccessToken)
      .mockReturnValueOnce(fakeNewRefreshToken);
    fakes.findUserById.mockResolvedValue(fakeUser);
    fakes.verifyJwt.mockReturnValue({ userId: fakeUser.id });
    fakes.tokenHashUtil.compare.mockReturnValue(true);
    fakes.tokenHashUtil.hash.mockReturnValue(fakeHashedNewRefreshToken);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { refresh: refreshService } = createAuthServiceWithFakes(fakes);
    const result = await refreshService({
      refreshToken: "old-refresh-token",
    });

    // 검증 결과가 예상과 같은지 확인
    expect(result).toEqual({
      accessToken: fakeNewAccessToken,
      refreshToken: fakeNewRefreshToken,
    });
    expect(fakes.verifyJwt).toHaveBeenCalledWith("old-refresh-token");
    expect(fakes.findUserById).toHaveBeenCalledWith(fakeUser.id);
    expect(fakes.tokenHashUtil.compare).toHaveBeenCalledWith({
      token: "old-refresh-token",
      hashedToken: fakeUser.refreshToken,
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(1, {
      data: { userId: fakeUser.id },
      expiresIn: 5,
    });
    expect(fakes.signJwt).toHaveBeenNthCalledWith(2, {
      data: { userId: fakeUser.id },
      expiresIn: 604800,
    });
    expect(fakes.tokenHashUtil.hash).toHaveBeenCalledWith(fakeNewRefreshToken);
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: fakeHashedNewRefreshToken,
    });
  });

  test("서명이 위조된 리프레시 토큰이면 권한 에러를 던지고 새로운 토큰을 발급하지 않는다", async () => {
    // 가짜 데이터 준비
    const jwtError = new TechnicalException(
      "jwt malformed",
      TechnicalExceptionCode.JWT_VERIFY_FAILED,
    );

    const fakes = createFakeAuthServiceDeps();
    fakes.verifyJwt.mockImplementation(() => {
      throw jwtError;
    });

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { refresh: refreshService } = createAuthServiceWithFakes(fakes);

    // 검증 결과가 예상과 같은지 확인
    await expect(
      refreshService({ refreshToken: "tampered-token" }),
    ).rejects.toThrow("권한이 없습니다.");
    expect(fakes.findUserById).not.toHaveBeenCalled();
    expect(fakes.signJwt).not.toHaveBeenCalled();
    expect(fakes.updateRefreshToken).not.toHaveBeenCalled();
  });

  test("만료된 리프레시 토큰이면 재로그인 안내 에러를 던지고 새로운 토큰을 발급하지 않는다", async () => {
    // 가짜 데이터 준비
    const jwtError = new TechnicalException(
      "jwt expired",
      TechnicalExceptionCode.TOKEN_EXPIRED,
    );

    const fakes = createFakeAuthServiceDeps();
    fakes.verifyJwt.mockImplementation(() => {
      throw jwtError;
    });

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { refresh: refreshService } = createAuthServiceWithFakes(fakes);

    // 검증 결과가 예상과 같은지 확인
    await expect(
      refreshService({ refreshToken: "expired-token" }),
    ).rejects.toThrow("세션이 삭제되었습니다. 다시 로그인 해주세요.");
    expect(fakes.findUserById).not.toHaveBeenCalled();
    expect(fakes.signJwt).not.toHaveBeenCalled();
    expect(fakes.updateRefreshToken).not.toHaveBeenCalled();
  });

  test("저장된 리프레시 토큰과 요청받은 리프레시 토큰이 일치하지 않으면 저장된 토큰을 삭제(강제 로그아웃)하고 에러를 던진다", async () => {
    // 가짜 데이터 준비
    const fakeUser = {
      id: 1,
      email: "asd@asd.com",
      password: "hashed_password",
      username: "nick",
      googleId: null,
      refreshToken: "hashed-stored-refresh-token",
    };

    const fakes = createFakeAuthServiceDeps();
    fakes.findUserById.mockResolvedValue(fakeUser);
    fakes.verifyJwt.mockReturnValue({ userId: fakeUser.id });
    fakes.tokenHashUtil.compare.mockReturnValue(false);

    // 가짜 데이터를 주입해서 가상의 프로세스 검증
    const { refresh: refreshService } = createAuthServiceWithFakes(fakes);

    // 검증 결과가 예상과 같은지 확인
    await expect(
      refreshService({ refreshToken: "stolen-old-token" }),
    ).rejects.toThrow(BusinessException);
    expect(fakes.tokenHashUtil.compare).toHaveBeenCalledWith({
      token: "stolen-old-token",
      hashedToken: fakeUser.refreshToken,
    });
    expect(fakes.signJwt).not.toHaveBeenCalled();
    expect(fakes.updateRefreshToken).toHaveBeenCalledWith({
      userId: fakeUser.id,
      refreshToken: null,
    });
  });
});
