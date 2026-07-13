import { Types } from "mongoose";
import { z } from "zod";

export const generalValidationFields = {
  id: z.string().refine(value => {return Types.ObjectId.isValid(value)}, "invalid ObjectId"),
  email: z.email({ error: "invalid email" }),
  password: z
    .string({ error: "password is required" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      {message:"password must be 8 characters long"}
    ),
  phone: z
    .string({ error: "phone is required" })
    .regex(/^01[0125][0-9]{8}$/),
    otp: z
    .string({ error: "otp is required" })
    .regex(/^\d{6}$/),
  userName: z.string({ error: "username is required" }).min(2).max(20),
  confirmPassword: z.string({ error: "confirm password is required" }),
  file: function (mimetype: string[]){
      return z.strictObject({
         fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.enum(mimetype),
    buffer: z.any().optional(),
    path: z.string().optional(),
    size: z.number()
      }).superRefine((args, ctx)=>{
        if (!args.buffer && !args.path) {
          ctx.addIssue({
            code: "custom",
            path: ['buffer'],
            message: "buffer is required"
          })
        }
      })
   
  }
  
};

export const paginationValidationSchema = {
  query: z.strictObject({
    page: z.coerce.number().optional(),
    size: z.coerce.number().optional(),
    search: z.string().optional()
  })
}
export type PaginateDto = z.infer<typeof paginationValidationSchema.query>