import { trace, SpanStatusCode } from "@opentelemetry/api";
import { metrics } from "@/lib/metrics";
import { WorkflowType } from "./types";

const tracer = trace.getTracer("career-os-orchestration");

export async function traceWorkflow<T>(params: {
  workflowId: string;
  workflowType: WorkflowType | string;
  operation: string;
  fn: () => Promise<T>;
}) {
  const startedAt = Date.now();
  return tracer.startActiveSpan(params.operation, async (span) => {
    span.setAttribute("workflow.id", params.workflowId);
    span.setAttribute("workflow.type", params.workflowType);
    try {
      const result = await params.fn();
      span.setStatus({ code: SpanStatusCode.OK });
      metrics.timing("orchestration.operation.duration_ms", Date.now() - startedAt, {
        operation: params.operation,
        workflowType: params.workflowType,
      });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      metrics.increment("orchestration.operation.error", {
        operation: params.operation,
        workflowType: params.workflowType,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
