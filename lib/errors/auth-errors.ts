export class AuthConsistencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConsistencyError";
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthConsistencyError);
    }
  }
}
