import { createHash, timingSafeEqual } from "crypto";
import { ITokenHashUtil } from "../contracts/token-hash-util.contract.js";

export const tokenHashUtil: ITokenHashUtil = {
  hash: (token) => {
    return createHash("sha256").update(token).digest("hex");
  },
  compare: (params) => {
    const tokenHash = createHash("sha256").update(params.token).digest("hex");
    const a = Buffer.from(tokenHash);
    const b = Buffer.from(params.hashedToken);

    // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 확인
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  },
};
