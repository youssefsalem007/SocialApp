import { HydratedDocument, PopulateOptions, Types } from "mongoose";
import {
  CreatePostBodyDto,
  ReactPostParamsDto,
  ReactPostQueryDto,
  UpdatePostBodyDto,
  UpdatePostParamsDto,
} from "./post.dto";
import { IUser } from "./../../common/interfaces/user.interface";
import { UserRepository } from "./../../DB/repository/user.repository";
import {
  redisService,
  RedisService,
} from "./../../common/service/redis.service";
import {
  notificationService,
  NotificationService,
} from "./../../common/service/notification.service";
import { PostRepository } from "./../../DB/repository/post.repository";
import {
  NotFoundException,
  BadRequestException,
} from "./../../common/exceptions/domain.exception";
import { s3Service, S3Service } from "./../../common/service/s3.service";
import { randomUUID } from "node:crypto";
import { IPost } from "./../../common/interfaces/post.interface";
import { getAvailability } from "./../../common/utils/post";
import { PaginateDto } from "../../common/validation";
import { IPaginate } from "../../common/interfaces";
import { toObjectId } from "./../../common/utils/objectid";

export class PostService {
  private populate: PopulateOptions[] = [
    { path: "likes" },
    { path: "createdBy" },
    { path: "tags" },
    { path: "updatedBy" },
    {
      path: "comments",
      populate: [{ path: "reply", populate: [{ path: "reply" }] }],
    },
  ];
  private readonly userRepository: UserRepository;
  private readonly postRepository: PostRepository;
  private readonly redis: RedisService;
  private readonly s3: S3Service;
  private readonly notification: NotificationService;
  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.notification = notificationService;
    this.s3 = s3Service;
    this.postRepository = new PostRepository();
  }

  async createPost(
    { availability, content, files = [], tags }: CreatePostBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IPost> {
    const mentions: Types.ObjectId[] = [];
    const FCM_Tokens: string[] = [];
    if (tags?.length) {
      const mentionedAccounts = await this.userRepository.find({
        filter: {
          _id: { $in: tags },
        },
      });
      if (mentionedAccounts.length != tags.length) {
        throw new NotFoundException(
          "Fail to find some or all mentioned accounts",
        );
      }

      for (const tag of tags) {
        mentions.push(Types.ObjectId.createFromHexString(tag));
        ((await this.redis.getFCMs(tag)) || []).map((token) =>
          FCM_Tokens.push(token),
        );
      }
    }

    const folderId = randomUUID();
    let attachments: string[] = [];
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `Post/${folderId}`,
      });
    }

    const post = await this.postRepository.createOne({
      data: {
        createdBy: user._id,
        content: content as string,
        attachments,
        folderId,
        availability,
        tags: mentions,
      },
    });

    if (!post) {
      if (attachments.length) {
        await this.s3.deleteAssets({
          Keys: attachments.map((ele) => {
            return { Key: ele };
          }),
        });
      }
      throw new BadRequestException("Fail");
    }

    if (FCM_Tokens.length) {
      await this.notification.sendNotifications({
        tokens: FCM_Tokens,
        data: {
          title: "Post Mention",
          body: JSON.stringify({
            message: `${user.userName} mentioned you in his post`,
            postId: post._id,
          }),
        },
      });
    }
    return post.toJSON();
  }

  async postList(
    { page, size, search }: PaginateDto,
    user: HydratedDocument<IUser>,
  ): Promise<IPaginate<IPost>> {
    const posts = await this.postRepository.paginate({
      filter: {
        $or: getAvailability(user),
        ...(search?.length
          ? { content: { $regex: search, $options: "i" } }
          : {}),
      },
      page,
      size,
      options: {
        populate: this.populate,
      },
    });
    return posts;
  }

  async reactPost(
    { postId }: ReactPostParamsDto,
    { react }: ReactPostQueryDto,
    user: HydratedDocument<IUser>,
  ) {
    const post = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: getAvailability(user),
      },
      update: {
        ...(Number(react) > 0
          ? { $addToSet: { likes: user._id } }
          : { $pull: { likes: user._id } }),
      },
      populate: this.populate,
    });
    if (!post) {
      throw new NotFoundException("Fail to find matching post");
    }
    return post.toJSON();
  }

  async updatePost(
    { postId }: UpdatePostParamsDto,
    {
      availability,
      content,
      files = [],
      tags = [],
      removeFiles = [],
      removeTags,
    }: UpdatePostBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IPost> {
    const post = await this.postRepository.findOne({
      filter: {
        _id: postId,
        createdBy: user._id,
      },
    });

    if (!post) {
      throw new NotFoundException("Fail to find matching post");
    }

    if (
      !post.content &&
      !content &&
      !files?.length &&
      post.attachments?.length == removeFiles.length
    ) {
      throw new BadRequestException("we cannot leave empty post");
    }

    const mentions: Types.ObjectId[] = [];
    const FCM_Tokens: string[] = [];
    if (tags?.length) {
      const mentionedAccounts = await this.userRepository.find({
        filter: {
          _id: { $in: tags },
        },
      });
      if (mentionedAccounts.length != tags.length) {
        throw new NotFoundException(
          "Fail to find some or all mentioned accounts",
        );
      }

      for (const tag of tags) {
        mentions.push(toObjectId(tag));
        ((await this.redis.getFCMs(tag)) || []).map((token) =>
          FCM_Tokens.push(token),
        );
      }
    }

    const folderId = post.folderId;
    let attachments: string[] = [];
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `Post/${folderId}`,
      });
    }

    const updatePost = await this.postRepository.findOneAndUpdate({
      filter: {
        _id: postId,
        createdBy: user._id,
      },
      update: [
        {
          $set: {
            content: content || post.content,
            availability: Number(availability || post.availability),
            updatedBy: user._id,
            attachments: {
              $setUnion: [
                {
                  $setDifference: [
                    { $ifNull: ["$attachments", []] },
                    removeFiles,
                  ],
                },
                attachments,
              ],
            },
            tags: {
              $setUnion: [
                {
                  $setDifference: [
                    { $ifNull: ["$tags", []] },
                    removeTags?.map((ele) => {
                      return toObjectId(ele);
                    }),
                  ],
                },
                mentions,
              ],
            },
          },
        },
      ],
    });

    if (!updatePost) {
      if (attachments.length) {
        await this.s3.deleteAssets({
          Keys: attachments.map((ele) => {
            return { Key: ele };
          }),
        });
      }
      throw new BadRequestException("Fail");
    }

    if (removeFiles?.length) {
      await this.s3.deleteAssets({
        Keys: attachments.map((ele) => {
          return { Key: ele };
        }),
      });
    }

    if (FCM_Tokens.length) {
      await this.notification.sendNotifications({
        tokens: FCM_Tokens,
        data: {
          title: "Post Mention",
          body: JSON.stringify({
            message: `${user.userName} mentioned you in his post`,
            postId: post._id,
          }),
        },
      });
    }
    return updatePost.toJSON();
  }
}

export const postService = new PostService();
