import crypto from "node:crypto";
import { ENCRYPTION_KEY, IV_LENGTH } from "../../../config/config";
import { BadRequestException } from "../../exceptions/domain.exception";

const ENC_KEY = Buffer.from(ENCRYPTION_KEY);
const ENC_IV_LENGTH = IV_LENGTH;

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(ENC_IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");

  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(plainText: string): string {
  const [ivHex, encryptedText] = plainText.split(":") || ([] as string[]);

  if (!ivHex || !encryptedText) {
    throw new BadRequestException("invalid encryption parts");
  }

  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, iv);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");

  decrypted += decipher.final("utf8");

  return decrypted;
}
