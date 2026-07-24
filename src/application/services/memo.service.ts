import { IMemoRepo } from "../contracts/memo-repo.contract.js";
import { IUserRepo } from "../contracts/user-repo.contract.js";
import { IInterestAnalyzer } from "../contracts/interest-analyzer.contract.js";
import { IContentModerator } from "../contracts/content-moderator.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";

export const createMemoService = (
  findAll: IMemoRepo["findAll"],
  create: IMemoRepo["create"],
  findUserById: IUserRepo["findUserById"],
  findById: IMemoRepo["findById"],
  update: IMemoRepo["update"],
  deleteMemoRepo: IMemoRepo["delete"],
  findRecentByUserId: IMemoRepo["findRecentByUserId"],
  analyze: IInterestAnalyzer["analyze"],
  isInappropriate: IContentModerator["isInappropriate"],
) => {
  // 존재하는 모든 메모를 추천 개수, 내 추천 여부와 함께 조회
  const getAllMemos = async (userId: number) => {
    const memos = await findAll(userId);
    return memos;
  };

  // 새로운 메모 생성
  const createMemo = async (params: {
    userId: number;
    title: string;
    content: string;
  }) => {
    // AI 기반 부적절 콘텐츠 검사
    if (
      await isInappropriate({ title: params.title, content: params.content })
    ) {
      throw new BusinessException("게시글을 작성할 수 없습니다.");
    }

    // 사용자 존재 확인
    const user = await findUserById(params.userId);
    if (!user) {
      throw new BusinessException("존재하지 않는 유저입니다.");
    }

    const newMemo = await create(params);
    return newMemo;
  };

  // 메모 업데이트
  const updateMemo = async (params: {
    memoId: number;
    userId: number;
    title?: string;
    content?: string;
  }) => {
    // 메모 존재 확인
    const memo = await findById(params.memoId);
    if (!memo) {
      throw new BusinessException("존재하지 않는 메모입니다.");
    }

    // 소유자 확인
    if (memo.userId !== params.userId) {
      throw new BusinessException("메모를 수정할 권한이 없습니다.");
    }

    // 메모 작성자 존재 확인
    const memoAuthor = await findUserById(memo.userId);
    if (!memoAuthor) {
      throw new BusinessException("존재하지 않는 유저입니다.");
    }

    // AI 기반 부적절 콘텐츠 검사
    const title = params.title ?? memo.title;
    const content = params.content ?? memo.content;
    if (await isInappropriate({ title, content })) {
      throw new BusinessException("게시글을 작성할 수 없습니다.");
    }

    // 메모 업데이트
    const updatedMemo = await update({
      id: params.memoId,
      title: params.title,
      content: params.content,
    });
    return updatedMemo;
  };

  // 메모 삭제
  const deleteMemo = async (params: { memoId: number; userId: number }) => {
    // 메모 존재 확인
    const memo = await findById(params.memoId);
    if (!memo) {
      throw new BusinessException("존재하지 않는 메모입니다.");
    }

    // 소유자 확인
    if (memo.userId !== params.userId) {
      throw new BusinessException("메모를 삭제할 권한이 없습니다.");
    }

    const deletedMemo = await deleteMemoRepo(params.memoId);
    return deletedMemo;
  };

  // 최신 메모 3개를 기반으로 관심사를 문장으로 분석
  const analyzeInterests = async (userId: number) => {
    const recentMemos = await findRecentByUserId({ userId, limit: 3 });
    const analysis = await analyze(
      recentMemos.map(({ title, content }) => ({ title, content })),
    );
    return analysis;
  };

  return { getAllMemos, createMemo, updateMemo, deleteMemo, analyzeInterests };
};

export type MemoServiceType = ReturnType<typeof createMemoService>;
