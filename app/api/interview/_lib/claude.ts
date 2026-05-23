const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const INTERVIEW_MODEL = "claude-sonnet-4-20250514";

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicMessageResponse = {
  content?: AnthropicTextBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function extractFirstJsonCandidate(text: string): string {
  const cleaned = stripCodeFence(text);
  const start = cleaned.search(/[\[{]/);

  if (start < 0) {
    throw new Error("Claude response did not contain JSON.");
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const opener = stack.pop();
      const validPair = (opener === "{" && char === "}") || (opener === "[" && char === "]");

      if (!validPair) {
        throw new Error("Claude response contained malformed JSON.");
      }

      if (stack.length === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  throw new Error("Claude response contained incomplete JSON.");
}

export function parseClaudeJson(text: string): unknown {
  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return JSON.parse(extractFirstJsonCandidate(text));
  }
}

export async function callClaudeJson<T>({
  system,
  user,
  maxTokens = 2500,
  model,
}: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<{ data: T; usage: AnthropicMessageResponse["usage"] }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[CLAUDE DISABLED] ANTHROPIC_API_KEY missing");
    return {
      data: null as unknown as T,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    };
  }

  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: model || INTERVIEW_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Claude request failed with status ${response.status}.${detail ? ` ${detail.slice(0, 240)}` : ""}`);
  }

  const payload = (await response.json()) as AnthropicMessageResponse;
  const text = payload.content?.find((block) => block.type === "text")?.text;

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }

  return {
    data: parseClaudeJson(text) as T,
    usage: payload.usage,
  };
}
