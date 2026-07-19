import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces/user.interface";
import { NextFunction, Request, Response } from "express";
import { redisService, RedisService } from "../../common/service/redis.service";
import { TokenService } from "./../../common/service/token.service";
import { randomUUID } from "node:crypto";
import { SECRET_KEY } from "../../config/config.js";
import { UserRepository } from "./../../DB/repository/user.repository";
import { REFRESH_SECRET_KEY } from "./../../config/config";
import { successResponse } from "./../../common/response/success.response";
import { s3Service, S3Service } from "./../../common/service/s3.service";
import {
  StorageApproachEnum,
  UploadApproachEnum,
} from "../../common/enums/multer.enum";
import { NotFoundException } from "../../common/exceptions/domain.exception";
import { ChatRepository } from './../../DB/repository/chat.repository';
import { IChat } from "../../common/interfaces/chat.interface";
import { ChatEnum } from "../../common/enums/chat.enum";

export class UserService {
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;
  private readonly userRepository: UserRepository;
  private readonly chatRepository: ChatRepository;
  private readonly s3: S3Service;
  constructor() {
    ((this.redis = redisService), (this.tokenService = new TokenService()));
    this.userRepository = new UserRepository();
    this.chatRepository = new ChatRepository();
    this.s3 = s3Service;
  }

  async profileImage(
    {
      ContentType,
      Originalname,
    }: { ContentType: string; Originalname: string },
    user: HydratedDocument<IUser>,
  ): Promise<{ user: IUser; url: string }> {
    const oldPic = user.profilePicture;
    const { url, Key } = await this.s3.createPreSignedUploadLink({
      path: `Users/${user._id.toString()}/Profile`,
      ContentType,
      Originalname,
    });

    user.profilePicture = Key as string;
    await user.save();

    if (oldPic) {
      await this.s3.deleteAsset({ Key: oldPic });
    }
    return { user, url };
  }

  async profileCoverImage(
    files: Express.Multer.File[],
    user: HydratedDocument<IUser>,
  ) {
    const oldUrls = user.profileCoverPicture;
    const urls = await this.s3.uploadAssets({
      files,
      path: `Users/${user._id.toString()}/Profile/Cover`,
      storageApproach: StorageApproachEnum.DISK,
      uploadApproach: UploadApproachEnum.SMALL,
    });

    user.profileCoverPicture = urls;
    await user.save();

    if (oldUrls?.length) {
      await this.s3.deleteAssets({
        Keys: oldUrls.map((ele) => {
          return { Key: ele };
        }),
      });
    }

    return user.toJSON();
  }

  async profile(user: HydratedDocument<IUser>): Promise<{user: IUser, groups: HydratedDocument<IChat>[]}> {
    await user.populate([{ path: "friends" }]);
    const groups = await this.chatRepository.find({
      filter: {type: ChatEnum.ovm, participants:{$in: [user._id]}}
    })
    return {user: user.toJSON(), groups};
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flag } = req.query;

      if (!req.user || !req.decoded) {
        throw new Error("unauthorized");
      }

      if (flag === "all") {
        req.user.changeCredentialsTime = new Date();
        await req.user.save();

        await this.redis.deletekey(this.redis.get_key(req.user._id));
      } else {
        await this.redis.set({
          key: this.redis.revoked_key({
            userId: req.user._id,
            jti: req.decoded.jti!,
          }),
          value: req.decoded.jti!,
          ttl: req.decoded.exp! - Math.floor(Date.now() / 1000),
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  refresh_token = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { authorization } = req.headers;

    if (!authorization) {
      throw new Error("token not exist");
    }

    const [prefix, token] = authorization.split(" ");
    if (prefix !== "bearer") {
      throw new Error("invalid token prefix");
    }

    if (!token) {
      throw new Error("invalid token");
    }

    const decoded = await this.tokenService.verify({
      token,
      secret: REFRESH_SECRET_KEY,
    });

    if (!decoded || !decoded?.sub) {
      throw new Error("invalid token");
    }

    const user = await this.userRepository.findOne({
      filter: { _id: decoded.sub },
    });

    if (!user) {
      throw new Error("user not exist");
    }

    const isTokenRevoked = await redisService.get(
      redisService.revoked_key({ userId: user._id, jti: decoded.jti! }),
    );

    if (isTokenRevoked) {
      throw new Error("invalid token revoked");
    }

    const access_token = await this.tokenService.sign({
      payload: { sub: user._id },
      secret: SECRET_KEY,
      options: {
        expiresIn: 60 * 5,
        jwtid: randomUUID(),
      },
    });
    successResponse({ res, data: { access_token } });
  };

  async deleteProfile(user: HydratedDocument<IUser>) {
    const account = await this.userRepository.deleteOne({
      filter: { _id: user._id, force: true },
    });

    if (!account.deletedCount) {
      throw new NotFoundException("Invalid account");
    }

    await this.s3.deleteFolderByPrefix({
      Prefix: `Users/${user._id.toString()}`,
    });

    return account;
  }
}

export default new UserService();
