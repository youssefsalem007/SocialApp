import { HydratedDocument, Types } from "mongoose";
import { CreateCommentParamsDto, CreateCommentBodyDto, ReplyOnCommentParamsDto } from "./comment.dto";
import { IUser } from "../../common/interfaces/user.interface";
import { UserRepository } from "../../DB/repository/user.repository";
import { redisService, RedisService } from "../../common/service/redis.service";
import {
  notificationService,
  NotificationService,
} from "../../common/service/notification.service";
import { PostRepository } from "../../DB/repository/post.repository";
import {
  NotFoundException,
  BadRequestException,
} from "../../common/exceptions/domain.exception";
import { s3Service, S3Service } from "../../common/service/s3.service";
import { CommentRepository } from "./../../DB/repository/comment.repository";
import { getAvailability } from "./../../common/utils/post";
import { IComment } from './../../common/interfaces/comment.interface';
import { IPost } from './../../common/interfaces/post.interface';

export class CommentService {
  private readonly userRepository: UserRepository;
  private readonly postRepository: PostRepository;
  private readonly commentRepository: CommentRepository;
  private readonly redis: RedisService;
  private readonly s3: S3Service;
  private readonly notification: NotificationService;
  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
    this.notification = notificationService;
    this.s3 = s3Service;
    this.postRepository = new PostRepository();
    this.commentRepository = new CommentRepository();
  }

  async createComment(
    { postId }: CreateCommentParamsDto,
    { content, files = [], tags }: CreateCommentBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IComment> {
    const post = await this.postRepository.findOne({
      filter: {
        _id: postId,
        $or: getAvailability(user),
      },
    });

    if (!post) {
      throw new NotFoundException("fail to find matching post");
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
        mentions.push(Types.ObjectId.createFromHexString(tag));
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

    const comment = await this.commentRepository.createOne({
      data: {
        createdBy: user._id,
        content: content as string,
        attachments,
        postId: post._id,
        tags: mentions,
      },
    });

    if (!comment) {
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
            message: `${user.userName} mentioned you in his comment`,
            postId: post._id,
            commentId: comment._id
          }),
        },
      });
    }
    return comment.toJSON();
  }

   async replyOnComment(
    { postId, commentId }: ReplyOnCommentParamsDto,
    { content, files = [], tags }: CreateCommentBodyDto,
    user: HydratedDocument<IUser>,
  ): Promise<IComment> {
    const comment = await this.commentRepository.findOne({
      filter: {
        _id: commentId,
        postId: postId,
      },
      options: {
        populate: [{
          path: "postId",
          match: {
            $or: getAvailability(user)
          }
        }]
      }
    });

    if (!comment?.postId) {
      throw new NotFoundException("fail to find matching comment");
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
        mentions.push(Types.ObjectId.createFromHexString(tag));
        ((await this.redis.getFCMs(tag)) || []).map((token) =>
          FCM_Tokens.push(token),
        );
      }
    }

    const post = comment.postId as HydratedDocument<IPost>

    const folderId = post.folderId;
    let attachments: string[] = [];
    if (files?.length) {
      attachments = await this.s3.uploadAssets({
        files: files as Express.Multer.File[],
        path: `Post/${folderId}`,
      });
    }

    const reply = await this.commentRepository.createOne({
      data: {
        createdBy: user._id,
        content: content as string,
        attachments,
        postId: postId,
        commentId: comment._id,
        tags: mentions,
      },
    });

    if (!reply) {
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
            message: `${user.userName} mentioned you in his comment`,
            postId: post._id,
            commentId: comment._id,
            replyId: reply._id
          }),
        },
      });
    }
    return reply.toJSON();
  }
}

export const commentService = new CommentService();
