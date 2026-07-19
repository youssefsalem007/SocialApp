import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IChat } from "../../common/interfaces";
import { ChatEnum } from "../../common/enums";
import { IMessage } from "./../../common/interfaces/chat.interface";

const messageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: function (this) {
        return !this.attachments?.length;
      },
    },

    attachments: { type: [String] },

    likes: [{ type: Types.ObjectId, ref: "User" }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },

    deletedAt: { type: Date },
    restoredAt: { type: Date },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

const chatSchema = new Schema<IChat>(
  {
    participants: [{ type: Types.ObjectId, required: true, ref: "User" }],
    createdBy: { type: Types.ObjectId, required: true, ref: "User" },

    type: { type: String, enum: ChatEnum, default: ChatEnum.ovo },
    messages: { type: [messageSchema], required: true },
    //ovm
    group: {
      type: String,
      required: function (this) {
        return this.type == ChatEnum.ovm;
      },
    },
    group_img: { type: String },
    roomId: {
      type: String,
      required: function (this) {
        return this.type == ChatEnum.ovm;
      },
    },

    deletedAt: { type: Date },
    restoredAt: { type: Date },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);

chatSchema.pre(["find", "findOne", "countDocuments"], function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;

  if (paranoid === false) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...rest });
  }
});

chatSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const update = this.getUpdate() as HydratedDocument<IChat>;

  if (update.deletedAt) {
    this.setUpdate({ ...update, $unset: { restoredAt: 1 } });
  }

  if (update.restoredAt) {
    this.setUpdate({ ...update, $unset: { deletedAt: 1 } });
    this.setQuery({ ...this.getQuery(), deletedAt: { $exists: true } });
  }

  const query = this.getQuery();
  const { paranoid, ...rest } = query;

  if (paranoid === false) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...rest });
  }
});

chatSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery();
  const { force, ...rest } = query;

  if (force === true) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...rest });
  }
});

export const chatModel = models.chat || model<IChat>("Chat", chatSchema);
chatModel.syncIndexes();
