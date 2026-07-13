import { Types } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../enums/user.enums";

export interface IUser {
  firstName: string; 
  lastName: string;
  slug: string;
  userName?: string;
  email: string;
  password: string;
  friends?: Types.ObjectId[] | IUser[] 

  phone?: string;
  profilePicture?: string;
  profileCoverPicture?: string[];

  gender: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  changeCredentialsTime?: Date;
  DOB?: Date;
  confirmEmail?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date; 
  restoredAt?: Date;
}