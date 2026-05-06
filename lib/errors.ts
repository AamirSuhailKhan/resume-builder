export class QueueUnavailableError extends Error {
  constructor(message = "Queue is unavailable. Check REDIS_URL and worker connectivity.") {
    super(message);
    this.name = "QueueUnavailableError";
  }
}
