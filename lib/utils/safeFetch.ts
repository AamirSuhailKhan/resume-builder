export type ApiEnvelope<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

type SafeFetchOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  skip?: boolean;
  invalidMessage?: string;
};

const INVALID_ID_SEGMENT = /\/(undefined|null|NaN)(?:\/|\?|$)/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMessage(value: unknown, fallback: string) {
  if (value instanceof Error) return value.message;
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

export function isValidResumeId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "NaN") {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
}

export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<ApiEnvelope<T>> {
  const {
    retries = 0,
    retryDelayMs = 400,
    skip = false,
    invalidMessage = "Invalid request",
    ...fetchOptions
  } = options;

  if (skip || !url || INVALID_ID_SEGMENT.test(url)) {
    console.warn("[FETCH BLOCKED]", { url, reason: invalidMessage });
    return { data: null, error: invalidMessage, status: 0 };
  }

  let attempt = 0;
  let lastError = "Network error";

  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          Accept: "application/json",
          ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
          ...fetchOptions.headers,
        },
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;

      if (!response.ok) {
        const message = getMessage(payload?.error, `Request failed with status ${response.status}`);
        console.error("[FETCH ERROR]", { url, status: response.status, message });
        return { data: null, error: message, status: response.status };
      }

      if (payload?.error) {
        const message = getMessage(payload.error, "Request failed");
        console.error("[FETCH ERROR]", { url, status: response.status, message });
        return { data: payload.data ?? null, error: message, status: response.status };
      }

      return {
        data: (payload?.data ?? payload ?? null) as T | null,
        error: null,
        status: response.status,
      };
    } catch (error) {
      lastError = getMessage(error, "Network error");
      if (attempt >= retries) break;
      await sleep(retryDelayMs * 2 ** attempt);
    }

    attempt += 1;
  }

  console.error("[FETCH ERROR]", { url, status: 0, message: lastError });
  return { data: null, error: lastError, status: 0 };
}
