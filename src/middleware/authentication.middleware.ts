import { NextFunction, Request, Response } from "express";
import { TokenService } from "../common/service/token.service";
import { UserRepository } from "../DB/repository/user.repository";
import { redisService } from "../common/service/redis.service";
import {
  BadRequestException,
  UnauthorizedException,
} from "../common/exceptions/domain.exception";


const tokenService = new TokenService();
const userRepository = new UserRepository();

export const authentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { authorization } = req.headers;

    if (!authorization) {
      throw new UnauthorizedException("token not exist");
    }

    const [prefix, token] = authorization.split(" ");

    if (prefix !== "Bearer") {
      throw new BadRequestException("invalid token prefix");
    }

    if (!token) {
      throw new BadRequestException("invalid token");
    }

    const decoded = await tokenService.verify({ token });

    if (!decoded || !decoded?.sub) {
      throw new BadRequestException("invalid token");
    }

    const user = await userRepository.findOne({
      filter: { _id: decoded.sub },
    });

    if (!user) {
      throw new BadRequestException("user not exist");
    }

    if (
      user.changeCredentialsTime &&
      user.changeCredentialsTime.getTime() > decoded.iat! * 1000
    ) {
      throw new BadRequestException("invalid token");
    }

    const revokeToken = await redisService.get(
      redisService.revoked_key({ userId: user._id, jti: decoded.jti! }),
    );

    if (revokeToken) {
      throw new BadRequestException("invalid token revoked");
    }

    req.user = user;
    req.decoded = decoded;
    next();
  } catch (error) {
    next(error);
  }
};