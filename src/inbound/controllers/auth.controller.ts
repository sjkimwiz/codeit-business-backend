import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthServiceType } from "../../application/services/auth.service.js";
import {
  signInDataSchema,
  signUpDataSchema,
  bearerTokenSchema,
  googleSignInDataSchema,
} from "../schemas/auth.schemas.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";
import { OAuth2Client } from "google-auth-library";

export const createAuthController = (
  signIn: AuthServiceType["signIn"],
  signUp: AuthServiceType["signUp"],
  signOut: AuthServiceType["signOut"],
  refresh: AuthServiceType["refresh"],
  googleSignIn: AuthServiceType["googleSignIn"],
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  router.post(
    "/signin",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = signInDataSchema.safeParse(req.body);
      if (success === false) {
        throw new BusinessException(z.prettifyError(error));
      }

      const { accessToken, refreshToken } = await signIn(data);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/auth",
        secure: process.env.NODE_ENV === "development" ? false : true,
        signed: false,
      });

      return res.json({ accessToken });
    },
  );

  router.post(
    "/signup",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = signUpDataSchema.safeParse(req.body);
      if (success === false) {
        throw new BusinessException(z.prettifyError(error));
      }

      await signUp(data);

      return res.json({});
    },
  );

  router.post(
    "/signout",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      // 저장된 리프레시 토큰을 null로 변경
      await signOut({ userId: req.userId! });

      // 리프레시 토큰이 저장된 브라우저 쿠키 삭제를 클라이언트에게 알림
      res.clearCookie("refreshToken", { path: "/api/auth" });

      return res.json({});
    },
  );

  router.post(
    "/refresh",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = bearerTokenSchema.safeParse({
        token: req.cookies?.refreshToken,
      });
      if (success === false) {
        throw new BusinessException(z.prettifyError(error));
      }

      const { accessToken, refreshToken } = await refresh({
        refreshToken: data.token,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/auth",
        secure: process.env.NODE_ENV === "development" ? false : true,
        signed: false,
      });

      return res.json({ accessToken });
    },
  );

  router.post(
    "/google-signin",
    async (req: Request, res: Response, next: NextFunction) => {
      // 요청으로 받은 크리덴셜 형식을 검증
      const { success, data, error } = googleSignInDataSchema.safeParse(
        req.body,
      );
      if (success === false) {
        throw new BusinessException(z.prettifyError(error));
      }

      // 구글에게 이 크리덴셜이 실제로 발급한 것이 맞는지 검증 요청
      const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
      let payload;
      try {
        const result = await client.verifyIdToken({
          idToken: data.credential,
          audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
        });
        payload = result.getPayload();
      } catch (err) {
        throw new BusinessException("구글 인증에 실패했습니다.");
      }
      if (payload == null || payload.email == null) {
        throw new BusinessException("구글 인증에 실패했습니다.");
      }

      // 검증된 구글 정보로 로그인(또는 필요 시 가입) 처리
      const { accessToken, refreshToken } = await googleSignIn({
        googleId: payload.sub,
        email: payload.email,
        username: payload.name ?? payload.email,
        emailVerified: payload.email_verified ?? false,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/auth",
        secure: process.env.NODE_ENV === "development" ? false : true,
        signed: false,
      });

      return res.json({ accessToken });
    },
  );

  return { router };
};
