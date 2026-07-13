import { z } from "zod";
import { createPost, reactOnPostGQL, reactPost, updatePost } from "./post.validation";

export type CreatePostBodyDto = z.infer<typeof createPost.body>;
export type ReactPostQueryDto = z.infer<typeof reactPost.query>;
export type ReactPostParamsDto = z.infer<typeof reactPost.params>;
export type UpdatePostParamsDto = z.infer<typeof updatePost.params>;
export type UpdatePostBodyDto = z.infer<typeof updatePost.body>;
export type ReactOnPostArgsDto = z.infer<typeof reactOnPostGQL>;
