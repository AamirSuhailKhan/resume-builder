"use client";

import { useEffect } from "react";
import { useWorkflowStore, WorkflowEventView } from "@/store/useWorkflowStore";

export function useWorkflowEvents(workflowId: string | null) {
  const appendEvent = useWorkflowStore((state) => state.appendEvent);
  const setStatus = useWorkflowStore((state) => state.setStatus);

  useEffect(() => {
    if (!workflowId) return;

    setStatus(workflowId, "connecting");
    const eventSource = new EventSource(`/api/v1/workflows/${workflowId}/events`);

    eventSource.onopen = () => setStatus(workflowId, "connected");

    eventSource.onerror = () => {
      setStatus(workflowId, "disconnected");
    };

    eventSource.onmessage = (event) => {
      ingest(event.data);
    };

    const eventNames = [
      "workflow.created",
      "workflow.started",
      "workflow.paused",
      "workflow.resumed",
      "workflow.completed",
      "workflow.failed",
      "workflow.canceled",
      "step.started",
      "step.completed",
      "step.failed",
      "step.retrying",
      "agent.started",
      "agent.completed",
      "agent.failed",
      "approval.requested",
      "approval.approved",
      "approval.rejected",
      "memory.retrieved",
      "tool.called",
      "cost.recorded",
    ];

    for (const name of eventNames) {
      eventSource.addEventListener(name, (event) => {
        ingest((event as MessageEvent).data);
      });
    }

    function ingest(raw: string) {
      try {
        const parsed = JSON.parse(raw) as WorkflowEventView;
        if (parsed.id) appendEvent(workflowId!, parsed);
      } catch {
        // Ignore heartbeats and malformed transient frames.
      }
    }

    return () => {
      eventSource.close();
      setStatus(workflowId, "disconnected");
    };
  }, [appendEvent, setStatus, workflowId]);
}
