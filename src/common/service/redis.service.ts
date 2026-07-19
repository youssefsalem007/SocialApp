import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../../config/config";
import { EmailEnum } from "../enums/email.enums";
import { Types } from "mongoose";

type RedisKeyType = { email: string; subject?: EmailEnum };
export class RedisService {
  private readonly client: RedisClientType;
  constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.handleEvents();
  }

  private handleEvents() {
    this.client.on("error", (error) => {
      console.log(`redis error ${error}`);
    });
    this.client.on("ready", () => {
      console.log("redis is ready");
    });
  }

  public async connect() {
    await this.client.connect();
    console.log("redis is connected");
  }

  revoked_key = ({
    userId,
    jti,
  }: {
    userId: Types.ObjectId | string;
    jti: string;
  }): string => {
    return `key: revoke_token::${userId}::${jti}`;
  };

  get_key = (userId: Types.ObjectId) => {
    return `revoke_token::${userId.toString()}`;
  };

  otp_key = ({
    email,
    subject = EmailEnum.CONFIRM_EMAIL,
  }: RedisKeyType): string => {
    return `otp::${email}::${subject}`;
  };

  max_otp_key = ({ email }: RedisKeyType) => {
    return `otp:max::${email}`;
  };

  block_otp_key = ({ email }: RedisKeyType): string => {
    return `otp:block::${email}`;
  };

  set = async ({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl: number | undefined;
  }): Promise<string | null> => {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return ttl
        ? await this.client.set(key, data, { EX: ttl })
        : await this.client.set(key, data);
    } catch (error) {
      console.log("error to set data in redis", error);
      return null;
    }
  };

  update = async ({
    key,
    value,
  }: {
    key: string;
    value: string | object;
  }): Promise<string | number | null> => {
    try {
      if (!(await this.client.exists(key))) {
        return 0;
      }
      const data = typeof value === "string" ? value : JSON.stringify(value);
      return await this.client.set(key, data);
    } catch (error) {
      console.log("error to update data in redis", error);
      return 0;
    }
  };

  get = async (key: string): Promise<any> => {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.log("error to get data in redis", error);
      return null;
    }
  };

  exists = async (key: string): Promise<number> => {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.log("error to check data in redis", error);
      return -2;
    }
  };

  ttl = async (key: string): Promise<number> => {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.log("error to check data in redis", error);
      return -2;
    }
  };

  deletekey = async (key: string | string[]): Promise<number> => {
    try {
      if (!key.length) return 0;
      return await this.client.del(key);
    } catch (error) {
      console.log("error to delete data in redis", error);
      return 0;
    }
  };

  keys = async (pattern: string): Promise<string[]> => {
    try {
      return await this.client.keys(`${pattern}*`);
    } catch (error) {
      console.log("error to get keys in redis", error);
      return [];
    }
  };

  incr = async (key: string): Promise<number> => {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.log("error to incr data in redis", error);
      return -2;
    }
  };

  mGet = async (keys: string[]): Promise<string[] | number | null> => {
    try {
      if (!keys.length) return 0;
      return (await this.client.mGet(keys)) as string[];
    } catch (error) {
      console.log(`fail in redis mGet operation ${error}`);
      return [];
    }
  };

  exxpire = async ({
    key,
    ttl,
  }: {
    key: string;
    ttl: number;
  }): Promise<number> => {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.log(`fail in redis to add expire operation ${error}`);
      return 0;
    }
  };

  FCM_key(userId: Types.ObjectId | string) {
    return `user:FCM:${userId.toString()}`;
  }
  async addFCM(userId: Types.ObjectId | string, FCMToken: string) {
    return await this.client.sAdd(this.FCM_key(userId), FCMToken);
  }

  async removeFCM(userId: Types.ObjectId | string, FCMToken: string) {
    return await this.client.sRem(this.FCM_key(userId), FCMToken);
  }

  async getFCMs(userId: Types.ObjectId | string) {
    return await this.client.sMembers(this.FCM_key(userId));
  }

  async hasFCMs(userId: Types.ObjectId | string) {
    return await this.client.sCard(this.FCM_key(userId));
  }

  async removeFCMUser(userId: Types.ObjectId | string) {
    return await this.client.del(this.FCM_key(userId));
  }

  socketKey(userId: Types.ObjectId | string) {
    return `user:sockets:${userId.toString()}`;
  }
  async addSocket(userId: Types.ObjectId | string, socketId: string) {
    return await this.client.sAdd(this.socketKey(userId), socketId);
  }

  async removeSocket(userId: Types.ObjectId | string, socketId: string) {
    return await this.client.sRem(this.socketKey(userId), socketId);
  }

  async getSockets(userId: Types.ObjectId | string) {
    return await this.client.sMembers(this.socketKey(userId));
  }

  async hasSockets(userId: Types.ObjectId | string) {
    return await this.client.sCard(this.socketKey(userId));
  }

  async removeUser(userId: Types.ObjectId | string) {
    return await this.client.del(this.socketKey(userId));
  }
}

export const redisService = new RedisService();
