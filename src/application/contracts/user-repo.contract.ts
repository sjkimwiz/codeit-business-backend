import { User } from "../../generated/prisma/client.js";

export interface IUserRepo {
  findUserByEmail: (email: string) => Promise<User | null>;
  findUserById: (id: number) => Promise<User | null>;
  findUserByGoogleId: (googleId: string) => Promise<User | null>;
  createUser: (parmas: {
    email: string;
    password: string;
    username: string;
  }) => Promise<User>;
  createUserWithGoogle: (params: {
    googleId: string;
    email: string;
    username: string;
  }) => Promise<User>;
  updateRefreshToken: (params: {
    userId: number;
    refreshToken: string | null;
  }) => Promise<void>;
  linkGoogleId: (params: { userId: number; googleId: string }) => Promise<void>;
}
