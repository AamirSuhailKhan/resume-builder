import { RetryPolicy, WorkflowFailureCategory } from "./types";

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1_000,
  maxDelayMs: 30_000,
  multiplier: 2,
  jitter: true,
  retryableErrors: [
    "transient_network",
    "provider_rate_limit",
    "model_overloaded",
    "tool_timeout",
    "browser_brittle",
    "unknown",
  ],
};

export function classifyFailure(error: unknown): WorkflowFailureCategory {
  const message = error instanceof Error ? error.message : String(error);

  if (/rate.?limit|429/i.test(message)) return "provider_rate_limit";
  if (/timeout|timed.?out/i.test(message)) return "tool_timeout";
  if (/network|ECONN|ETIMEDOUT|fetch failed/i.test(message)) return "transient_network";
  if (/overloaded|unavailable|503/i.test(message)) return "model_overloaded";
  if (/selector|captcha|browser|navigation/i.test(message)) return "browser_brittle";
  if (/approval/i.test(message)) return "approval_expired";
  if (/policy|permission|forbidden/i.test(message)) return "policy_blocked";
  if (/invalid|zod|parse/i.test(message)) return "invalid_input";
  if (/injection|secret|pii|security/i.test(message)) return "security_violation";

  return "unknown";
}

export function computeBackoffMs(policy: RetryPolicy, attempt: number) {
  const exponential = policy.initialDelayMs * Math.pow(policy.multiplier, Math.max(attempt - 1, 0));
  const capped = Math.min(exponential, policy.maxDelayMs);
  if (!policy.jitter) return capped;
  const jitter = capped * 0.2 * Math.random();
  return Math.round(capped + jitter);
}

export function mergeRetryPolicy(base: RetryPolicy, override?: Partial<RetryPolicy>): RetryPolicy {
  return {
    ...base,
    ...override,
    retryableErrors: override?.retryableErrors ?? base.retryableErrors,
  };
}
