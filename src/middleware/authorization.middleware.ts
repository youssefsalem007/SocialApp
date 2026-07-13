import { NextFunction, Request, Response } from "express";
import { ForbiddenException } from "../common/exceptions/domain.exception";
import { RoleEnum } from "../common/enums/user.enums.js";
import { HydratedDocument } from "mongoose";
import { IUser } from './../common/interfaces/user.interface';
import { MapGraphQLError } from './../common/exceptions/domain.exception';

export const authorization = (roles: RoleEnum[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenException("UnAuthorized");
    }
    return next();
  };
};

export const GQLAuthorization = async (roles: RoleEnum[], user: HydratedDocument<IUser>): Promise<boolean> => {

    if (!roles.includes(user.role)) {
      throw MapGraphQLError(new ForbiddenException("Unauthorized"));
    }
    return true
};
