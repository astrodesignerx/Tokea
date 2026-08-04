export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const NotFoundError = (msg = "Not found") => new HttpError(404, msg);
export const ForbiddenError = (msg = "Forbidden") => new HttpError(403, msg);
export const UnauthorizedError = (msg = "Unauthorized") => new HttpError(401, msg);
export const BadRequestError = (msg: string) => new HttpError(400, msg);
