import { HydratedDocument, Types } from "mongoose";
import { IUser } from "./../../common/interfaces/user.interface";
import { ChatRepository } from "./../../DB/repository/chat.repository";
import { toObjectId } from "./../../common/utils/objectid";
import { NotFoundException } from "../../common/exceptions/domain.exception";
import { IChat } from "../../common/interfaces/chat.interface";
import { ChatEnum } from "../../common/enums/chat.enum";
import { UserRepository } from "./../../DB/repository/user.repository";
import { s3Service, S3Service } from "./../../common/service/s3.service";
import { randomUUID } from "node:crypto";

export class ChatService {
  private chatRepository: ChatRepository;
  private userRepository: UserRepository;
  private s3Service: S3Service;
  constructor() {
    this.chatRepository = new ChatRepository();
    this.userRepository = new UserRepository();
    this.s3Service = s3Service;
  }

  sayHi = () => {
    return "done";
  };

  async getChat(
    participantId: string,
    { page, size }: { page?: string; size?: string },
    user: HydratedDocument<IUser>,
  ): Promise<IChat> {
    const chat = await this.chatRepository.findOneChat({
      filter: {
        participants: { $all: [user._id, toObjectId(participantId)] },
      },
      options: {
        populate: [{ path: "participants" }],
      },
      page,
      size,
    });
    if (!chat) {
      throw new NotFoundException("Fail to find matching conversation");
    }
    return chat.toJSON();
  }

  async sendMessage(
    { content, sendTo }: { content: string; sendTo: string },
    user: HydratedDocument<IUser>,
  ): Promise<void> {
    let chat = await this.chatRepository.findOneAndUpdate({
      filter: {
        participants: { $all: [user.id, toObjectId(sendTo)] },
        type: ChatEnum.ovo,
      },
      update: {
        $addToSet: {
          messages: {
            content,
            createdBy: user._id,
          },
        },
      },
    });
    if (!chat) {
      chat = await this.chatRepository.createOne({
        data: {
          participants: [user._id, toObjectId(sendTo)],
          createdBy: user._id,
          type: ChatEnum.ovo,
          messages: [
            {
              content,
              createdBy: user._id,
            },
          ],
        },
      });
    }
  }

  async sendGroupMessage(
    { content, groupId }: { content: string; groupId: string },
    user: HydratedDocument<IUser>,
  ): Promise<string> {
    let chat = await this.chatRepository.findOneAndUpdate({
      filter: {
        _id:  toObjectId(groupId),
        participants: { $in: [user.id] },
        type: ChatEnum.ovm,
      },
      update: {
        $addToSet: {
          messages: {
            content,
            createdBy: user._id,
          },
        },
      },
    });
    if (!chat) {
      throw new NotFoundException("Failed to find matching group")
    }
    return chat.roomId
  }

  async createGroup(
    {
      participantsIds = [],
      group,
    }: { participantsIds: Types.ObjectId[] | string[]; group: string },
    user: HydratedDocument<IUser>,
    file?: Express.Multer.File,
  ): Promise<IChat> {
    participantsIds = [
      ...new Set(
        participantsIds.map((ele) => {
          return toObjectId(ele as string);
        }),
      ),
    ];

    const users = await this.userRepository.find({
      filter: {
        _id: { $in: participantsIds },
        friends: { $in: [user._id] },
      },
    });
 
    if (users.length != participantsIds.length) {
      throw new NotFoundException("Fail to find all participants");
    }

    let group_img!: string;
    const roomId = randomUUID();
    const path = `Chat/group/${roomId}`;

    if (file) {
      group_img = await this.s3Service.uploadAsset({
        path,
        file,
      });
    }

    const chattingGroup = await this.chatRepository.createOne({
      data: {
        participants: [...participantsIds, user._id],
        createdBy: user._id,
        messages: [],
        type: ChatEnum.ovm,
        group,
        roomId,
        group_img,
      },
    });
    return chattingGroup.toJSON();
  }

   async getGroupChat(
    groupId: string,
    { page, size }: { page?: string; size?: string },
    user: HydratedDocument<IUser>,
  ): Promise<IChat> {
    const chat = await this.chatRepository.findOneChat({
      filter: {
        _id: toObjectId(groupId),
        participants: { $in: [user._id] },
        type: ChatEnum.ovm
      },
      options: {
        populate: [{ path: "participants" }, {path: "messages.createdBy"}],
      },
      page,
      size,
    });
    if (!chat) {
      throw new NotFoundException("Fail to find matching conversation");
    }
    return chat.toJSON();
  }
}
export const chatService = new ChatService();
