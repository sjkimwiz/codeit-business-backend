export enum BusinessExceptionCode {
  ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED",
}

export class BusinessException extends Error {
  code: BusinessExceptionCode | undefined;

  constructor(message: string, code?: BusinessExceptionCode) {
    super(message);
    this.code = code;
  }
}
