import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { JobsService } from "@/lib/services/jobs.service";
import {
  AgentContext,
  JsonObject,
  ToolCallResult,
  ToolDefinition,
  ToolRegistryView,
} from "./types";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register<TInput extends JsonObject, TOutput extends JsonObject>(tool: ToolDefinition<TInput, TOutput>) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as ToolDefinition);
    return this;
  }

  view(context: AgentContext): ToolRegistryView {
    return {
      list: () => [...this.tools.values()].map(({ name, description, permissions }) => ({
        name,
        description,
        permissions,
      })),
      call: async (name: string, input: JsonObject) => this.call(name, input, context),
    };
  }

  async call(name: string, input: JsonObject, context: AgentContext): Promise<ToolCallResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);

    const startedAt = Date.now();
    const parsed = tool.schema.parse(input);
    const output = await withTimeout(
      tool.execute(parsed, context),
      tool.timeoutMs ?? 30_000,
      `Tool timed out: ${name}`
    );

    await context.emit({
      type: "tool.called",
      source: "tool_registry",
      workflowId: context.workflowId,
      agentRunId: context.agentRunId,
      stepId: context.step.id,
      visibility: "internal",
      payload: {
        toolName: name,
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      toolName: name,
      output,
      durationMs: Date.now() - startedAt,
    };
  }
}

const memorySearchSchema = z.object({
  type: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

const topMatchesSchema = z.object({
  limit: z.number().int().min(1).max(25).default(10),
  minScore: z.number().int().min(0).max(100).default(0),
});

const artifactCreateSchema = z.object({
  applicationId: z.string().uuid().optional(),
  resumeId: z.string().uuid().optional(),
  type: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  content: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}

export const defaultToolRegistry = new ToolRegistry()
  .register({
    name: "career_memory.search",
    description: "Searches the user's career memories by type and query.",
    permissions: ["memory:read"],
    schema: memorySearchSchema,
    execute: async (input, context) => {
      const memories = await prisma.careerMemory.findMany({
        where: compact({
          userId: context.userId,
          type: input.type,
          OR: input.query && input.query.trim()
            ? [
                { title: { contains: input.query, mode: "insensitive" } },
                { content: { contains: input.query, mode: "insensitive" } },
              ]
            : undefined,
        }),
        orderBy: { updatedAt: "desc" },
        take: input.limit,
      });
      return { memories };
    },
  })
  .register({
    name: "jobs.top_matches",
    description: "Loads top job opportunities for the user.",
    permissions: ["jobs:read"],
    schema: topMatchesSchema,
    execute: async (input, context) => {
      const opportunities = await JobsService.getOpportunitiesForUser(context.userId);
      return {
        opportunities: opportunities
          .filter((job) => job.matchScore >= input.minScore)
          .slice(0, input.limit),
      };
    },
  })
  .register({
    name: "application_artifact.create",
    description: "Stores a generated application artifact such as a resume diff or outreach draft.",
    permissions: ["applications:write"],
    schema: artifactCreateSchema,
    execute: async (input, context) => {
      const artifact = await prisma.applicationArtifact.create({
        data: compact({
          userId: context.userId,
          applicationId: input.applicationId,
          resumeId: input.resumeId,
          type: input.type,
          title: input.title,
          content: input.content as Prisma.InputJsonValue,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          source: context.step.agentType ?? "agent",
        }) as Prisma.ApplicationArtifactUncheckedCreateInput,
      });
      return { artifactId: artifact.id };
    },
  });

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
