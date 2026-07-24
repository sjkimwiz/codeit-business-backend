export interface IInterestAnalyzer {
  // 최근 메모를 기반으로 관심사와 추천 관심사를 100자 이하 문장으로 반환
  analyze: (memos: { title: string; content: string }[]) => Promise<string>;
}
