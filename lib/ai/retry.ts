export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 4_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = options.shouldRetry?.(error, attempt) ?? true;
      if (!canRetry || attempt >= retries) {
        break;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}
