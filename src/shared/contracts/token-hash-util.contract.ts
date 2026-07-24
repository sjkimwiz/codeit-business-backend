export interface ITokenHashUtil {
  hash: (token: string) => string;
  compare: (params: { token: string; hashedToken: string }) => boolean;
}
