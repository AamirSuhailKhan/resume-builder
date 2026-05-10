import { create } from "zustand";

export type WorkflowEventView = {
  id: string;
  workflowId: string | null;
  type: string;
  source: string;
  visibility: string;
  payload: Record<string, unknown>;
  sequence: string;
  createdAt: string;
};

interface WorkflowStore {
  eventsByWorkflow: Record<string, WorkflowEventView[]>;
  statusByWorkflow: Record<string, "connecting" | "connected" | "disconnected">;
  appendEvent: (workflowId: string, event: WorkflowEventView) => void;
  setStatus: (workflowId: string, status: "connecting" | "connected" | "disconnected") => void;
  clearWorkflow: (workflowId: string) => void;
}

export const EMPTY_ARRAY: WorkflowEventView[] = [];

export const useWorkflowStore = create<WorkflowStore>()((set) => ({
  eventsByWorkflow: {},
  statusByWorkflow: {},
  appendEvent: (workflowId, event) =>
    set((state) => {
      const current = state.eventsByWorkflow[workflowId] ?? [];
      if (current.some((existing) => existing.id === event.id)) return state;
      return {
        eventsByWorkflow: {
          ...state.eventsByWorkflow,
          [workflowId]: [...current, event].slice(-500),
        },
      };
    }),
  setStatus: (workflowId, status) =>
    set((state) => {
      if (state.statusByWorkflow[workflowId] === status) return state;
      return {
        statusByWorkflow: {
          ...state.statusByWorkflow,
          [workflowId]: status,
        },
      };
    }),
  clearWorkflow: (workflowId) =>
    set((state) => {
      const eventsByWorkflow = { ...state.eventsByWorkflow };
      const statusByWorkflow = { ...state.statusByWorkflow };
      delete eventsByWorkflow[workflowId];
      delete statusByWorkflow[workflowId];
      return { eventsByWorkflow, statusByWorkflow };
    }),
}));

export const selectWorkflowEvents = (workflowId: string) => (state: WorkflowStore) =>
  state.eventsByWorkflow[workflowId] ?? EMPTY_ARRAY;

export const selectWorkflowStatus = (workflowId: string) => (state: WorkflowStore) =>
  state.statusByWorkflow[workflowId] ?? "disconnected";
