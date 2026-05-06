/**
 * Wraps an async function with retry logic.
 * Useful for handling transient database or network errors.
 *
 * @param fn The async function to execute.
 * @param retries Number of retries before failing.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries === 0) throw e;
    console.warn(`[withRetry] Execution failed, retrying... (${retries} retries left)`, e);
    // Exponential backoff could be added here
    await new Promise((res) => setTimeout(res, 500));
    return withRetry(fn, retries - 1);
  }
}
