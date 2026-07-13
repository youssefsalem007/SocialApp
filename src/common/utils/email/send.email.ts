import nodemailer from "nodemailer"
import { EMAIL, PASSWORD } from './../../../config/config';
import Mail from "nodemailer/lib/mailer/index.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL,
        pass: PASSWORD
    }
})

export const sendEmail = async ({ to, subject, html }:Mail.Options):Promise<void> => {
    await transporter.sendMail({
        from: `Social App <${EMAIL}>`,
        to,
        subject,
        html
    })
}



