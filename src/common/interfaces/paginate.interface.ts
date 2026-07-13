import { HydratedDocument } from "mongoose";

export interface IPaginate<TRawDoc> {
  docs: HydratedDocument<TRawDoc>[];
  currentpage?: number | undefined;
  pages?: number | string;
  size?: number | string | undefined;
}
