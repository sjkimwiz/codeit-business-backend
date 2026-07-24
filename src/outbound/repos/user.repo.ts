import { IUserRepo } from "../../application/contracts/user-repo.contract.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { prismaClient } from "./prismaClinet.js";

export const createUserRepo = (): IUserRepo => {
  // 이메일로 사용자 조회
  const findUserByEmail: IUserRepo["findUserByEmail"] = async (
    email: string,
  ) => {
    const foundUser = await prismaClient.user.findUnique({
      where: { email },
    });
    return foundUser;
  };

  // ID로 사용자 조회
  const findUserById: IUserRepo["findUserById"] = async (id: number) => {
    const foundUser = await prismaClient.user.findUnique({
      where: { id },
    });
    return foundUser;
  };

  // 사용자 생성
  const createUser: IUserRepo["createUser"] = async (params) => {
    try {
      const newUser = await prismaClient.user.create({
        data: {
          email: params.email,
          password: params.password,
          username: params.username,
        },
      });

      return newUser;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new TechnicalException(
            err.message,
            TechnicalExceptionCode.EMAIL_DUPLICATED,
          );
        }
      }

      throw err;
    }
  };

  // 구글 정보로 신규 사용자 생성
  const createUserWithGoogle: IUserRepo["createUserWithGoogle"] = async (
    params,
  ) => {
    const newUser = await prismaClient.user.create({
      data: {
        googleId: params.googleId,
        email: params.email,
        username: params.username,
      },
    });

    return newUser;
  };

  // googleId로 사용자 조회
  const findUserByGoogleId: IUserRepo["findUserByGoogleId"] = async (
    googleId: string,
  ) => {
    const foundUser = await prismaClient.user.findUnique({
      where: { googleId },
    });
    return foundUser;
  };

  // 기존 사용자 계정에 googleId 연동
  const linkGoogleId: IUserRepo["linkGoogleId"] = async (params) => {
    await prismaClient.user.update({
      where: { id: params.userId },
      data: { googleId: params.googleId },
    });
  };

  // 사용자의 리프레시 토큰 갱신
  const updateRefreshToken: IUserRepo["updateRefreshToken"] = async (
    params,
  ) => {
    await prismaClient.user.update({
      where: { id: params.userId },
      data: { refreshToken: params.refreshToken },
    });
  };

  return {
    findUserByEmail,
    findUserById,
    findUserByGoogleId,
    createUser,
    createUserWithGoogle,
    linkGoogleId,
    updateRefreshToken,
  };
};
