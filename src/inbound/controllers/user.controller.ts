import { Router, Request, Response, NextFunction } from "express";
import { UserServiceType } from "../../application/services/user.service.js";
import { MemoServiceType } from "../../application/services/memo.service.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";

export const createUserController = (
  getMe: UserServiceType["getMe"],
  analyzeInterests: MemoServiceType["analyzeInterests"],
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  router.get(
    "/me",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const user = await getMe(req.userId!);
      // 본인의 최신 메모 기반 관심사 분석 결과를 프로필에 포함
      const interestAnalysis = await analyzeInterests(req.userId!);
      res.json({ me: { ...user, interestAnalysis } });
    },
  );

  return { router };
};
