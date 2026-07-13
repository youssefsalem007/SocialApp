import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IPost } from "../../common/interfaces";
import {  AvailabilityEnum} from "../../common/enums";


const postSchema = new Schema<IPost>(
  {
    folderId: { type: String, required: true },
    content: { type: String, required: function(this){
      return !this.attachments?.length
    }},
    attachments: { type: [String] },
    availability: { type: Number, enum: AvailabilityEnum, default: AvailabilityEnum.PUBLIC },
    likes: [{ type: Types.ObjectId, ref: "User" }],
    tags: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Types.ObjectId, ref: "User"},
    deletedAt: { type: Date},
    restoredAt: { type: Date},
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strict: true,
    strictQuery: true,
  },
);


postSchema.virtual("comments", {
  localField:"_id",
  foreignField:"postId",
  ref:"Comment",
})

postSchema.pre(["find", "findOne", "countDocuments"], function () {
  const query = this.getQuery();
  const { paranoid, ...rest } = query;

  if (paranoid === false) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: false }, ...rest });
  }
});

  postSchema.pre(["updateOne", "findOneAndUpdate"], function () {
  const update = this.getUpdate() as HydratedDocument<IPost>;

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

postSchema.pre(["deleteOne", "findOneAndDelete"], function () {
  const query = this.getQuery();
  const { force, ...rest } = query;

  if (force === true) {
    this.setQuery(rest);
  } else {
    this.setQuery({ deletedAt: { $exists: true }, ...rest });
  }
});


export const PostModel = models.Post || model<IPost>("Post", postSchema);
PostModel.syncIndexes()
