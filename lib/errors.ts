export class QueueUnavailableError extends Error {
  constructor(message = "Queue is unavailable. Check REDIS_URL and worker connectivity.") {
    super(message);
    this.name = "QueueUnavailableError";
  }
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}
