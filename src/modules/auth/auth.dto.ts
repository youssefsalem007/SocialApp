import {z} from "zod"
import { confirmEmail, login, resendOtp, signup } from "./auth.validation"

// export interface LoginDto {
//   email: string;
//   password: string;
// }

// export interface SignupDto extends LoginDto {
//   userName: string;
// }


export type LoginDto= z.infer<typeof login.body>
export type SignupDto= z.infer<typeof signup.body>
export type confirmEmailDto= z.infer<typeof confirmEmail.body>
export type resendOtpDto= z.infer<typeof resendOtp.body>
