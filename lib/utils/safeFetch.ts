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
  if (typeof value === "object" && value !== null) {
    try {
      if ('message' in value && typeof (value as any).message === 'string') return (value as any).message;
      if ('error' in value && typeof (value as any).error === 'string') return (value as any).error;
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
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

  const method = fetchOptions.method || "GET";

  if (skip || !url || INVALID_ID_SEGMENT.test(url)) {
    console.warn(`[FETCH BLOCKED] URL: ${url} | Reason: ${invalidMessage}`);
    return { data: null, error: invalidMessage, status: 0 };
  }

  let attempt = 0;
  let lastError = "Network error";

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
          ...fetchOptions.headers,
        },
      });
      clearTimeout(timeout);

      const contentType = response.headers.get("content-type") || "";
      let payload: any = null;
      let rawText = "";

      if (response.status !== 204) {
        rawText = await response.text().catch(() => "");
        
        if (!contentType.includes("application/json")) {
          console.error(`[FETCH HTML/NON-JSON ERROR] URL: ${url} | Method: ${method} | Status: ${response.status} | Raw: ${rawText.substring(0, 300)}`);
          throw new Error(`Server returned non-JSON response (Status: ${response.status})`);
        }

        try {
          payload = JSON.parse(rawText);
        } catch (err) {
          console.error(`[FETCH JSON PARSE ERROR] URL: ${url} | Method: ${method} | Raw: ${rawText.substring(0, 300)}`);
          throw new Error("Invalid JSON response from server");
        }
      }

      if (!response.ok) {
        const message = getMessage(payload?.error || payload, `Request failed with status ${response.status}`);
        console.error(`[FETCH ERROR] URL: ${url} | Method: ${method} | Status: ${response.status} | Message: ${message} | Raw: ${rawText.substring(0, 300)}`);
        return { data: null, error: message, status: response.status };
      }

      if (payload && typeof payload === 'object' && payload.error) {
        const message = getMessage(payload.error, "Request failed");
        console.error(`[FETCH ERROR (200 OK)] URL: ${url} | Method: ${method} | Message: ${message} | Raw: ${rawText.substring(0, 300)}`);
        return { data: payload.data ?? null, error: message, status: response.status };
      }

      return {
        data: (payload?.data !== undefined ? payload.data : (payload ?? null)) as T | null,
        error: null,
        status: response.status,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      lastError = getMessage(error, "Network error");
      
      if (error.name !== "AbortError" || attempt >= retries) {
        console.error(`[FETCH EXCEPTION] URL: ${url} | Method: ${method} | Attempt: ${attempt + 1}/${retries + 1} | Error: ${lastError}`);
      }
      
      if (attempt >= retries) break;
      await sleep(retryDelayMs * 2 ** attempt);
    }

    attempt += 1;
  }

  return { data: null, error: lastError, status: 0 };
}
