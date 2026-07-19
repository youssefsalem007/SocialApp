import { GraphQLError } from "graphql";
import { ApplicationExeption } from "./application.exeption";

export const MapGraphQLError = (error: ApplicationExeption) => {
  throw new GraphQLError(error.message || "internalServerError", {
    extensions: {
      statusCode: error.statusCode || 500,
      cause: error.cause,
    },
  });
};

export class BadRequestException extends ApplicationExeption {
  constructor(message: string = "BadRequest", cause?: unknown) {
    super(message, 400, cause);
  }
}

export class ConflictException extends ApplicationExeption {
  constructor(message: string = "Conflict", cause?: unknown) {
    super(message, 409, cause);
  }
}

export class NotFoundException extends ApplicationExeption {
  constructor(message: string = "NotFound", cause?: unknown) {
    super(message, 404, cause);
  }
}

export class UnauthorizedException extends ApplicationExeption {
  constructor(message: string = "Unauthorized", cause?: unknown) {
    super(message, 401, cause);
  }
}

export class ForbiddenException extends ApplicationExeption {
  constructor(message: string = "Forbidden", cause?: unknown) {
    super(message, 403, cause);
  }
}
