export class ApplicationExeption extends Error {
  constructor( message: string, public statusCode: number,cause?: unknown) {
    super(message, {cause});
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
    toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      cause: this.cause,
    };
  }
}


