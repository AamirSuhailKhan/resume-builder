import type { UIMessage } from "ai";

export type StreamFailure = {
  error: string;
  code: "STREAM_UNAVAILABLE" | "STREAM_TRUNCATED" | "STREAM_INVALID";
};

export function extractTextFromUIMessages(messages: UIMessage[]) {
  return messages
    .flatMap((message) => message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("");
}

export function streamErrorResponse(
  error: string,
  code: StreamFailure["code"] = "STREAM_UNAVAILABLE",
  status = 503
) {
  return Response.json(
    {
      success: false,
      data: null,
      error,
      meta: { code },
    },
    { status }
  );
}
