import { compare, hash } from "bcrypt";
import { SALT_ROUNDS } from "../../../config/config";

export const generateHash = async ({
  plainText,
  salt = SALT_ROUNDS,
}: {
  plainText: string;
  salt?: number;
}): Promise<string> => {
  return await hash(plainText, salt);
};

export const compareHash = async ({
  plainText,
  cipherText,
}: {
  plainText: string;
  cipherText: string;
}): Promise<boolean> => {
  return await compare(plainText, cipherText);
};
