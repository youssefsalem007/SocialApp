import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IComment } from "../../common/interfaces";

const commentSchema = new Schema<IComment>(
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
    postId: [{ type: Types.ObjectId, ref: "Post", required: true }],
    commentId: [{ type: Types.ObjectId, ref: "Comment" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User" },
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

commentSchema.virtual("reply", {
  localField: "_id",
  foreignField: "commentId",
  ref: "Comment",
});

commentSchema.pre(["find", "findOne", "countDocuments"], function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;

  if (paranoid === false) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...rest });
  }
});

commentSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const update = this.getUpdate() as HydratedDocument<IComment>;

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

commentSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery();
  const { force, ...rest } = query;

  if (force === true) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...rest });
  }
});

export const commentModel =
  models.comment || model<IComment>("Comment", commentSchema);
commentModel.syncIndexes();
