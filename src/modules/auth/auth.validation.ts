import { z } from "zod";
import { generalValidationFields } from "../../common/validation";

export const resendOtp = {
  body: z.strictObject({
    email: generalValidationFields.email,
  }),
};

export const confirmEmail = {
 body: resendOtp.body.safeExtend({
    otp: generalValidationFields.otp,
  }),
};


export const login = {
  body: resendOtp.body.safeExtend({
    password: generalValidationFields.password,
    FCM: z.string().optional()
  }),
};

export const signup = {
  body: login.body
    .safeExtend({
      userName: generalValidationFields.userName,
      phone: generalValidationFields.phone.optional(),
      confirmPassword: generalValidationFields.confirmPassword,
    })
    .refine(
      (data) => {
        return data.password === data.confirmPassword;
      },
      { error: "password missmatch" },
    ),
};
