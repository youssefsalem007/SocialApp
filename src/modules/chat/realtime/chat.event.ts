import { Server } from "socket.io";
import { IAuthSocket } from "../../../common/types/express.types";
import { chatService, ChatService } from "../chat.service";
import { SocketValidation } from "./../../../middleware/validation.middleware";
import * as validators from "./../chat.validation.js";
import {
  redisService,
  RedisService,
} from "./../../../common/service/redis.service";

export class ChatEvent {
  private redisService: RedisService;
  private chatService: ChatService;
  constructor() {
    this.redisService = redisService;
    this.chatService = chatService;
  }

  sayHi = (socket: IAuthSocket) => {
    return socket.on("sayHi", async (data: { name: string }) => {
      try {
        await SocketValidation<{ name: string }>(validators.sayHi, data);
        const result = this.chatService.sayHi();
        socket.emit("sayHi", result);
      } catch (error) {
        socket.emit("custom_error", error);
      }
    });
  };

  sendMessage = (socket: IAuthSocket, io: Server) => {
    return socket.on(
      "sendMessage",
      async ({ content, sendTo }: { content: string; sendTo: string }) => {
        try {
          console.log({ content, sendTo });
          await this.chatService.sendMessage(
            { content, sendTo },
            socket.data.user,
          );
          io.to(await this.redisService.getSockets(socket.data.user._id)).emit(
            "successMessage",
            { content, sendTo },
          );
          const receiverSocketIds = await this.redisService.getSockets(sendTo);
          if (receiverSocketIds.length) {
            socket
              .to(receiverSocketIds)
              .emit("newMessage", { content, from: socket.data.user });
          }
        } catch (error) {
          socket.emit("custom_error", error);
        }
      },
    );
  };

  sendGroupMessage = (socket: IAuthSocket, io: Server) => {
    return socket.on(
      "sendGroupMessage",
      async ({ content, groupId }: { content: string; groupId: string }) => {
        try {
          console.log({ content, groupId });
          const roomId = await this.chatService.sendGroupMessage(
            { content, groupId },
            socket.data.user,
          );
          io.to(await this.redisService.getSockets(socket.data.user._id)).emit(
            "successMessage",
            { content, sendTo: groupId },
          );
          socket.to(roomId).emit("newMessage", { content, groupId });
        } catch (error) {
          socket.emit("custom_error", error);
        }
      },
    );
  };

  join_room = (socket: IAuthSocket, io: Server) => {
    return socket.on("join_room", async ({ roomId }: { roomId: string }) => {
      try {
        socket.join(roomId);
      } catch (error) {
        socket.emit("custom_error", error);
      }
    });
  };
}
export const chatEvent = new ChatEvent();
