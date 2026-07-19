import { DataBaseRepository } from "./base.repository";
import { IChat } from "../../common/interfaces/chat.interface";
import { chatModel } from "./../models/chat.model";
import {
  FlattenMaps,
  HydratedDocument,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
} from "mongoose";

export class ChatRepository extends DataBaseRepository<IChat> {
  constructor() {
    super(chatModel);
  }

  async findOneChat({
    filter,
    projection,
    options,
    page,
    size,
  }: {
    filter?: QueryFilter<IChat>;
    projection?: ProjectionType<IChat> | null | undefined;
    options?: (QueryOptions<IChat> & { lean?: false }) | null | undefined;
    page?: string | undefined;
    size?: string | undefined;
  }): Promise<HydratedDocument<IChat> | null>;

  async findOneChat({
    filter,
    projection,
    options,
    page,
    size,
  }: {
    filter?: QueryFilter<IChat>;
    projection?: ProjectionType<IChat> | null | undefined;
    options?: (QueryOptions<IChat> & { lean?: true }) | null | undefined;
    page?: string | undefined;
    size?: string | undefined;
  }): Promise<null | FlattenMaps<IChat>>;

  async findOneChat({
    filter,
    projection,
    options,
    page = "1",
    size = "5",
  }: {
    filter?: QueryFilter<IChat>;
    projection?: ProjectionType<IChat> | null | undefined;
    options?: QueryOptions<IChat> | null | undefined;
    page?: string | undefined | number;
    size?: string | undefined | number;
  }): Promise<HydratedDocument<IChat> | FlattenMaps<IChat> | null> {
    page = parseInt(page as string);
    size = parseInt(size as string);
    const doc = this.model.findOne(filter, {
      messages: { $slice: [-(page * size), size] },
    });

    if (options?.lean) doc.lean(options.lean);
    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    return await doc.exec();
  }
}
