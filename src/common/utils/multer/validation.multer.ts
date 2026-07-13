import { Request } from "express";
import { FileFilterCallback } from "multer";
import { BadRequestException } from "./../../exceptions/domain.exception";

export const fileFieldValidation = {
  image: ["image/jpeg", "image/jpg", "image/png"],
  video: ["video/mp4"],
};

export const fileFilter = (validation: string[]) => {
  return function (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) {

    if (!validation.includes(file.mimetype)) {
      return cb(new BadRequestException("Invalid file format"));
    }

    return cb(null, true);
  };
};
