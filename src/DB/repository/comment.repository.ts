import { DataBaseRepository } from "./base.repository";
import { IComment } from './../../common/interfaces/comment.interface';
import { commentModel } from './../models/comment.model';

export class CommentRepository extends DataBaseRepository<IComment> {
  constructor() {
    super(commentModel);
  }
}
