import type { UIMessage } from "ai";
import type { StoredCoachMessage } from "@/lib/coach/types";

export function storedMessagesToUi(stored: StoredCoachMessage[]): UIMessage[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

export function storedMessagesFromJson(raw: unknown): StoredCoachMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is StoredCoachMessage => {
      return (
        m &&
        typeof m === "object" &&
        "role" in m &&
        "content" in m &&
        (m.role === "user" || m.role === "assistant")
      );
    })
    .map((m) => ({
      id: typeof m.id === "string" ? m.id : crypto.randomUUID(),
      role: m.role,
      content: String(m.content),
      createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
    }));
}
