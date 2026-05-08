import pino from "pino";

// Configure pino for structured JSON logging
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }
    : {}),
});

export function withCorrelationId(correlationId: string) {
  return logger.child({ correlationId });
}

export function withJobId(jobId: string, queue: string) {
  return logger.child({ jobId, queue });
}

export function withAiRequestId(aiRequestId: string, provider: string) {
  return logger.child({ aiRequestId, provider });
}
