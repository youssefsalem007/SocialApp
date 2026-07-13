import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { HydratedDocument } from "mongoose";
import { randomUUID } from "node:crypto";
import { IUser } from "../interfaces";
import { RoleEnum, TokenTypeEnum } from "../enums";
import { redisService, RedisService } from "./redis.service";
import { UserRepository } from "../../DB/repository/user.repository";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../exceptions/domain.exception";
import {
  SYSTEM_ACCESS_TOKEN,
  USER_ACCESS_TOKEN,
  SYSTEM_REFRESH_TOKEN,
  USER_REFRESH_TOKEN,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../../config/config"; // adjust path to your actual config file location

export class TokenService {
  private readonly userRepository: UserRepository;
  private readonly redis: RedisService;

  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
  }

  sign = async ({
    payload,
    secret = USER_ACCESS_TOKEN,
    options,
  }: {
    payload: object;
    secret?: string;
    options?: SignOptions;
  }): Promise<string> => {
    return jwt.sign(payload, secret, options);
  };

  verify = async ({
    token,
    secret = USER_ACCESS_TOKEN,
  }: {
    token: string;
    secret?: string;
  }): Promise<JwtPayload> => {
    return jwt.verify(token, secret) as JwtPayload;
  };

  detectSignatureLevel = (
    role: RoleEnum,
  ): { accessSignature: string; refreshSignature: string } => {
    switch (role) {
      case RoleEnum.ADMIN:
        return {
          accessSignature: SYSTEM_ACCESS_TOKEN,
          refreshSignature: SYSTEM_REFRESH_TOKEN,
        };
      default:
        return {
          accessSignature: USER_ACCESS_TOKEN,
          refreshSignature: USER_REFRESH_TOKEN,
        };
    }
  };

  getSignature = (
    tokenType: TokenTypeEnum = TokenTypeEnum.ACCESS,
    signatureLevel: RoleEnum,
  ): string => {
    const signatures = this.detectSignatureLevel(signatureLevel);
    switch (tokenType) {
      case TokenTypeEnum.REFRESH:
        return signatures.refreshSignature;
      default:
        return signatures.accessSignature;
    }
  };

  decodeToken = async ({
    token,
    tokenType = TokenTypeEnum.ACCESS,
  }: {
    token: string;
    tokenType?: TokenTypeEnum;
  }): Promise<{
    user: HydratedDocument<IUser>;
    decoded: JwtPayload;
  }> => {
    const decoded = jwt.decode(token) as JwtPayload;

    if (!decoded?.aud?.length) {
      throw new BadRequestException("Missing token audience");
    }

    const [tokenApproach, signatureLevel] = decoded.aud as string[];

    if (tokenType !== (tokenApproach as unknown as TokenTypeEnum)) {
      throw new BadRequestException(
        `Invalid token approach only ${tokenType} allowed for this endpoint`,
      );
    }

    if (
      decoded.jti &&
      (await this.redis.get(
        this.redis.revoked_key({
          userId: decoded.sub as string,
          jti: decoded.jti,
        }),
      ))
    ) {
      throw new UnauthorizedException("Invalid Login session");
    }

    const secret = this.getSignature(
      tokenApproach as unknown as TokenTypeEnum,
      signatureLevel as unknown as RoleEnum,
    );

    const verifiedData = jwt.verify(token, secret) as JwtPayload;
    if (!verifiedData?.sub) {
      throw new BadRequestException("Invalid token payload");
    }

    const user = await this.userRepository.findOne({
      filter: {
        _id: verifiedData.sub,
      },
    });
    if (!user) {
      throw new NotFoundException("Not registered account");
    }

    if (
      user.changeCredentialsTime &&
      user.changeCredentialsTime?.getTime() >=
        ((decoded.iat as number) || 0) * 1000
    ) {
      throw new UnauthorizedException("Invalid login session");
    }

    return { user, decoded };
  };

  createLoginCredentials = async (
    user: HydratedDocument<IUser>,
    issuer: string,
  ): Promise<{ access_token: string; refresh_token: string }> => {
    const { accessSignature, refreshSignature } = this.detectSignatureLevel(
      user.role,
    );
    const jwtid = randomUUID();

    const access_token = await this.sign({
      payload: { sub: user._id },
      secret: accessSignature,
      options: {
        issuer,
        audience: [
          TokenTypeEnum.ACCESS as unknown as string,
          user.role as unknown as string,
        ],
        expiresIn: ACCESS_TOKEN_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
        jwtid,
      },
    });

    const refresh_token = await this.sign({
      payload: { sub: user._id },
      secret: refreshSignature,
      options: {
        issuer,
        audience: [
          TokenTypeEnum.REFRESH as unknown as string,
          user.role as unknown as string,
        ],
        expiresIn: REFRESH_TOKEN_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
        jwtid,
      },
    });

    return { access_token, refresh_token };
  };
}

export const tokenService = new TokenService();





// import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
// import { REFRESH_SECRET_KEY, SECRET_KEY } from "../../config/config";
// import { HydratedDocument } from "mongoose";
// import { IUser } from "../interfaces/user.interface.js";
// import { randomUUID } from "node:crypto";

// export class TokenService {
//   constructor() {}

//   sign = async ({
//     payload,
//     secret = SECRET_KEY,
//     options,
//   }: {
//     payload: object;
//     secret?: string;
//     options?: SignOptions;
//   }): Promise<string> => {
//     return jwt.sign(payload, secret, options);
//   };

//   verify = async ({
//     token,
//     secret = SECRET_KEY,
//     options
//   }: {
//     token: string;
//     secret?: string;
//     options?: SignOptions;
//   }): Promise<JwtPayload> => {
//     return jwt.verify(token, secret) as JwtPayload;
//   };


//   createLoginCredentials = async (user: HydratedDocument<IUser>, issuer: string):Promise<{access_token: string, refresh_token: string}> =>{
//  const jwtid = randomUUID();

//   const access_token = await this.sign({
//     payload: { sub: user._id},
//     secret: SECRET_KEY,
//     options: {
//       issuer,
//       expiresIn: 60 * 3,
//       jwtid,
//     },
//   });

//   const refresh_token = await this.sign({
//     payload: { sub: user._id },
//     secret: REFRESH_SECRET_KEY,
//     options: {
//       issuer,
//       expiresIn: "1y",
//       jwtid,
//     },
//   });

//    return {access_token, refresh_token}
//   }
// }
