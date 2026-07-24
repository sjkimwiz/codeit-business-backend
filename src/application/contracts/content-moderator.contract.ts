export interface IContentModerator {
  // 제목/내용을 검사해서 부적절한 콘텐츠인지 여부를 반환
  isInappropriate: (params: {
    title: string;
    content: string;
  }) => Promise<boolean>;
}
