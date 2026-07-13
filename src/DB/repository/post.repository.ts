import { IPost } from "../../common/interfaces";
import { DataBaseRepository } from "./base.repository";
import { PostModel } from "../models/post.model";

export class PostRepository extends DataBaseRepository<IPost> {
  constructor() {
    super(PostModel);
  }
}
