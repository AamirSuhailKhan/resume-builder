import { EventEmitter } from "events";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { WorkflowEventInput } from "./types";

type PersistedWorkflowEvent = {
  id: string;
  userId: string;
  workflowId: string | null;
  agentRunId: string | null;
  stepId: string | null;
  type: string;
  source: string;
  visibility: string;
  payload: Prisma.JsonValue;
  traceId: string;
  sequence: bigint;
  createdAt: Date;
};

class WorkflowEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500);
  }
}

const localEmitter = new WorkflowEventEmitter();

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

export class OrchestrationEventBus {
  static async publish(userId: string, event: WorkflowEventInput): Promise<PersistedWorkflowEvent> {
    const traceId = event.traceId ?? crypto.randomUUID();

    const persisted = await prisma.workflowEvent.create({
      data: compact({
        userId,
        workflowId: event.workflowId,
        agentRunId: event.agentRunId,
        stepId: event.stepId,
        type: event.type,
        source: event.source,
        visibility: event.visibility ?? "internal",
        payload: event.payload as Prisma.InputJsonValue,
        traceId,
      }) as Prisma.WorkflowEventUncheckedCreateInput,
    });

    localEmitter.emit(this.channel(userId), persisted);
    if (event.workflowId) {
      localEmitter.emit(this.workflowChannel(event.workflowId), persisted);
    }

    logger.info({
      workflowId: event.workflowId,
      eventType: event.type,
      traceId,
    }, "[Orchestration] event published");

    return persisted;
  }

  static subscribeWorkflow(workflowId: string, listener: (event: PersistedWorkflowEvent) => void) {
    const channel = this.workflowChannel(workflowId);
    localEmitter.on(channel, listener);
    return () => localEmitter.off(channel, listener);
  }

  static subscribeUser(userId: string, listener: (event: PersistedWorkflowEvent) => void) {
    const channel = this.channel(userId);
    localEmitter.on(channel, listener);
    return () => localEmitter.off(channel, listener);
  }

  static async listWorkflowEvents(userId: string, workflowId: string, afterSequence?: bigint) {
    return prisma.workflowEvent.findMany({
      where: compact({
        userId,
        workflowId,
        sequence: afterSequence ? { gt: afterSequence } : undefined,
      }) as Prisma.WorkflowEventWhereInput,
      orderBy: { sequence: "asc" },
      take: 500,
    });
  }

  private static channel(userId: string) {
    return `orchestration:user:${userId}`;
  }

  private static workflowChannel(workflowId: string) {
    return `orchestration:workflow:${workflowId}`;
  }
}
