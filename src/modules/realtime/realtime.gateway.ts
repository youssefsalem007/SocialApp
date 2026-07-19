import { Server as HtpSeverType } from "node:http";
import { Server } from "socket.io";
import { IAuthSocket } from "../../common/types/express.types";
import {
  tokenService,
  TokenService,
} from "./../../common/service/token.service";
import {
  redisService,
  RedisService,
} from "./../../common/service/redis.service";
import { chatGateway } from "../chat";

export class RealTimeGateway {
  private io!: Server;
  private tokenService: TokenService;
  private redisService: RedisService;
  
  constructor() {
    this.tokenService = tokenService;
    this.redisService = redisService;
  }

  authentication = async (socket: IAuthSocket, next: any) => {
    try {
      const { user, decoded } = await this.tokenService.decodeToken({
        token:
          socket.handshake.auth.authorization ||
          socket.handshake.headers.authorization,
      });
      socket.data = { user, decoded };

      await this.redisService.addSocket(user._id, socket.id);
      next();
    } catch (error) {
      next(error);
    }
  };

  initializeIo = (httpServer: HtpSeverType) => {
    this.io = new Server(httpServer, { cors: { origin: "*" } });

    this.io.use(this.authentication);

    this.io.on("connection", async (socket: IAuthSocket) => {


        chatGateway.registerEvents(socket, this.io)

      socket.on("disconnect", async () => {
        await this.redisService.removeSocket(socket.data.user._id, socket.id);
        const connections =
          (await this.redisService.getSockets(socket.data.user._id)) || [];

        if (connections.length < 1) {
          this.io.emit("offline_user", { userId: socket.data.user._id });
        }
      });
    });
  };
  getIo(){
    return this.io
  }
}

export const realTimeGateway = new RealTimeGateway();
