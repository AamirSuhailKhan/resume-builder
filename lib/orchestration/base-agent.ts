import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  AgentContext,
  AgentResult,
  AgentType,
  JsonObject,
} from "./types";

export abstract class BaseAgent<TOutput extends JsonObject = JsonObject> {
  abstract readonly type: AgentType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly outputSchema: z.ZodType<TOutput>;

  async plan(context: AgentContext): Promise<JsonObject> {
    return {
      agent: this.type,
      stepId: context.step.id,
      memoryCount: context.memory.length,
      tools: context.tools.list().map((tool) => tool.name),
    };
  }

  async run(context: AgentContext): Promise<AgentResult<TOutput>> {
    const startedAt = Date.now();
    await context.emit({
      type: "agent.started",
      source: this.type,
      workflowId: context.workflowId,
      agentRunId: context.agentRunId,
      stepId: context.step.id,
      visibility: "user_visible",
      payload: { agentType: this.type, name: this.name },
    });

    try {
      const result = await this.execute(context);
      const output = this.outputSchema.parse(result.output);

      await prisma.agentRun.update({
        where: { id: context.agentRunId },
        data: {
          status: result.status ?? "completed",
          output: output as Prisma.InputJsonValue,
          costUsd: result.costUsd ?? 0,
          tokenUsage: result.tokenUsage as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      await context.emit({
        type: "agent.completed",
        source: this.type,
        workflowId: context.workflowId,
        agentRunId: context.agentRunId,
        stepId: context.step.id,
        visibility: "user_visible",
        payload: {
          agentType: this.type,
          summary: result.summary,
          durationMs: Date.now() - startedAt,
          costUsd: result.costUsd ?? 0,
        },
      });

      return { ...result, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Agent failed";
      logger.error({ error, agentType: this.type, workflowId: context.workflowId }, "[Agent] failed");

      await prisma.agentRun.update({
        where: { id: context.agentRunId },
        data: {
          status: "failed",
          error: message,
          completedAt: new Date(),
        },
      }).catch(() => undefined);

      await context.emit({
        type: "agent.failed",
        source: this.type,
        workflowId: context.workflowId,
        agentRunId: context.agentRunId,
        stepId: context.step.id,
        visibility: "user_visible",
        payload: { agentType: this.type, error: message },
      });

      throw error;
    }
  }

  protected abstract execute(context: AgentContext): Promise<AgentResult<TOutput>>;
}
