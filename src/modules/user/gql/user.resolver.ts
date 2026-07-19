import userService, { UserService } from "./../user.service";
import { IAuthUser } from "./../../../common/types/express.types";
import { IUser } from "./../../../common/interfaces/user.interface";
import { GQLAuthorization, GQLValidation } from "../../../middleware";
import { endPoint } from "../user.authorization";
import { profileGQL } from "./../user.validation";

export class UserResolver {
  private readonly userService: UserService;

  constructor() {
    this.userService = userService;
  }
  profile = async (
    parent: unknown,
    args: { search?: string },
    { user }: IAuthUser,
  ): Promise<{ message: string; data: IUser }> => {
    await GQLAuthorization(endPoint.profile, user);
    await GQLValidation<{ search?: string }>(profileGQL, args);
    const { user: data } = await this.userService.profile(user);
    return { message: "welcome", data };
  };
}
export const userResolver = new UserResolver();
