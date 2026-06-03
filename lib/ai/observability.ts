export type AIEventLevel = "info" | "warn" | "error";

export type AIEvent = {
  level?: AIEventLevel;
  system: string;
  event: string;
  latencyMs?: number;
  userId?: string;
  provider?: string;
  model?: string;
  meta?: Record<string, unknown>;
};

export function logAIEvent(event: AIEvent) {
  const level = event.level ?? "info";
  const payload = {
    system: event.system,
    event: event.event,
    latencyMs: event.latencyMs,
    userId: event.userId,
    provider: event.provider,
    model: event.model,
    ...(event.meta ? { meta: event.meta } : {}),
  };

  if (level === "error") {
    console.error("[ai:event]", JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn("[ai:event]", JSON.stringify(payload));
    return;
  }

  console.info("[ai:event]", JSON.stringify(payload));
}
