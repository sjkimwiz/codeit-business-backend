import z from "zod";

export const signInDataSchema = z.object({
  email: z.email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(4, "비밀번호는 최소 4자 이상입니다."),
});

export const signUpDataSchema = z.object({
  email: z.email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(4, "비밀번호는 최소 4자 이상입니다."),
  username: z.string().min(1, "이름은 최소 1글자 이상입니다"),
});

export const bearerTokenSchema = z.object({
  token: z.string().min(1, "토큰은 필수입니다."),
});

export const googleSignInDataSchema = z.object({
  credential: z.string().min(1, "크리덴셜은 필수입니다."),
});
