import { createAuthService } from "./application/services/auth.service.js";
import { createUserService } from "./application/services/user.service.js";
import { createMemoService } from "./application/services/memo.service.js";
import { createRecommendService } from "./application/services/recommend.service.js";
import { createAuthController } from "./inbound/controllers/auth.controller.js";
import { createMemoController } from "./inbound/controllers/memo.controller.js";
import { createRecommendController } from "./inbound/controllers/recommend.controller.js";
import { createUserController } from "./inbound/controllers/user.controller.js";
import { createAuthMiddleware } from "./inbound/middlewares/auth.middleware.js";
import { createUserRepo } from "./outbound/repos/user.repo.js";
import { createMemoRepo } from "./outbound/repos/memo.repo.js";
import { createRecommendRepo } from "./outbound/repos/recommend.repo.js";
import { createOpenAiClient } from "./outbound/externals/openai.client.js";
import { createInterestAnalyzer } from "./outbound/externals/interest-analyzer.external.js";
import { createContentModerator } from "./outbound/externals/content-moderator.external.js";
import { bcryptUtil } from "./shared/utils/bcrypt.util.js";
import { signJwt, jwtUtil } from "./shared/utils/jwt.util.js";
import { tokenHashUtil } from "./shared/utils/token-hash.util.js";

export const bootstrap = () => {
  const {
    findUserByEmail,
    createUser,
    createUserWithGoogle,
    findUserByGoogleId,
    linkGoogleId,
    findUserById,
    updateRefreshToken,
  } = createUserRepo();
  const {
    findAll,
    create,
    findById,
    update,
    delete: deleteMemoRepo,
    findRecentByUserId,
  } = createMemoRepo();
  const openaiClient = createOpenAiClient();
  const { analyze } = createInterestAnalyzer(openaiClient);
  const { isInappropriate } = createContentModerator(openaiClient);
  const {
    findByUserIdAndArticleId,
    create: createRecommend,
    delete: deleteRecommendRepo,
  } = createRecommendRepo();

  const { signIn, signUp, signOut, refresh, googleSignIn } = createAuthService(
    findUserByEmail,
    createUser,
    signJwt,
    bcryptUtil,
    updateRefreshToken,
    findUserById,
    jwtUtil.verifyJwt,
    tokenHashUtil,
    createUserWithGoogle,
    findUserByGoogleId,
    linkGoogleId,
  );
  const { getMe } = createUserService(findUserById);
  const { getAllMemos, createMemo, updateMemo, deleteMemo, analyzeInterests } =
    createMemoService(
      findAll,
      create,
      findUserById,
      findById,
      update,
      deleteMemoRepo,
      findRecentByUserId,
      analyze,
      isInappropriate,
    );
  const { toggleRecommend } = createRecommendService(
    findById,
    findByUserIdAndArticleId,
    createRecommend,
    deleteRecommendRepo,
  );

  const authMiddleware = createAuthMiddleware(jwtUtil.verifyJwt);
  const { router: authRouter } = createAuthController(
    signIn,
    signUp,
    signOut,
    refresh,
    googleSignIn,
    authMiddleware,
  );
  const { router: userRouter } = createUserController(
    getMe,
    analyzeInterests,
    authMiddleware,
  );
  const { router: memoRouter } = createMemoController(
    getAllMemos,
    createMemo,
    updateMemo,
    deleteMemo,
    authMiddleware,
  );
  const { router: recommendRouter } = createRecommendController(
    toggleRecommend,
    authMiddleware,
  );

  return { authRouter, userRouter, memoRouter, recommendRouter };
};
