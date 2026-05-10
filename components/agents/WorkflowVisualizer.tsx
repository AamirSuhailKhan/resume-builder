"use client";

import { useCallback } from "react";

import { Activity, CheckCircle2, CircleDashed, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflowEvents } from "@/hooks/useWorkflowEvents";
import { useWorkflowStore, EMPTY_ARRAY } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";

export function WorkflowVisualizer({
  workflowId,
  title = "Live Workflow Events",
}: {
  workflowId: string;
  title?: string;
}) {
  useWorkflowEvents(workflowId);
  const events = useWorkflowStore(
    useCallback((state) => state.eventsByWorkflow[workflowId] ?? EMPTY_ARRAY, [workflowId])
  );
  const status = useWorkflowStore(
    useCallback((state) => state.statusByWorkflow[workflowId] ?? "disconnected", [workflowId])
  );

  return (
    <Card variant="elevated">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Badge variant={status === "connected" ? "success" : status === "connecting" ? "warning" : "neutral"}>
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.slice(-12).map((event) => (
          <div key={event.id} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", iconTone(event.type))}>
              {iconFor(event.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{event.type}</p>
                <span className="text-xs text-muted-foreground">#{event.sequence}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {summarizePayload(event.payload)}
              </p>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-surface/70 p-5 text-sm text-muted-foreground">
            Live events will appear here once this workflow starts or resumes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function iconFor(type: string) {
  if (type.includes("completed")) return <CheckCircle2 className="h-4 w-4" />;
  if (type.includes("failed") || type.includes("canceled")) return <XCircle className="h-4 w-4" />;
  if (type.includes("approval")) return <ShieldCheck className="h-4 w-4" />;
  if (type.includes("started") || type.includes("retrying")) return <Activity className="h-4 w-4" />;
  return <CircleDashed className="h-4 w-4" />;
}

function iconTone(type: string) {
  if (type.includes("completed")) return "border-success/25 bg-success/10 text-success";
  if (type.includes("failed") || type.includes("canceled")) return "border-danger/25 bg-danger/10 text-danger";
  if (type.includes("approval")) return "border-warning/25 bg-warning/10 text-warning";
  return "border-primary/25 bg-primary/10 text-primary-300 light:text-primary-700";
}

function summarizePayload(payload: Record<string, unknown>) {
  const summary = payload.summary ?? payload.reason ?? payload.stepName ?? payload.agentType ?? payload.error;
  if (typeof summary === "string") return summary;
  return JSON.stringify(payload);
}
