import { EventEmitter } from "events";
import { OptimizeResult } from "@/lib/ai";

type BaseDomainEvent = {
  traceId: string;
  timestamp: Date;
};

export type ResumeOptimizedEvent = BaseDomainEvent & {
  resumeId: string;
  result: OptimizeResult;
};

export type JobIngestedEvent = BaseDomainEvent & {
  jobId: string;
  company: string;
};

export type ApplicationCreatedEvent = BaseDomainEvent & {
  appId: string;
};

export type AtsCompletedEvent = BaseDomainEvent & {
  jobRecordId: string;
  result?: unknown;
};

export type ProviderFailedEvent = BaseDomainEvent & {
  provider: string;
  error: string;
};

export type AnalyticsRefreshedEvent = BaseDomainEvent & {
  userId: string;
};

export type DomainEvents = {
  "resume.optimized": ResumeOptimizedEvent;
  "job.ingested": JobIngestedEvent;
  "application.created": ApplicationCreatedEvent;
  "provider.failed": ProviderFailedEvent;
};

type EventName = keyof DomainEvents | `ats.completed.${string}` | `analytics.refreshed.${string}`;
type EventPayload<TName extends EventName> =
  TName extends keyof DomainEvents
    ? DomainEvents[TName]
    : TName extends `ats.completed.${string}`
      ? AtsCompletedEvent
      : AnalyticsRefreshedEvent;

function baseEvent(): BaseDomainEvent {
  return {
    traceId: crypto.randomUUID(),
    timestamp: new Date(),
  };
}

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitEvent<TName extends keyof DomainEvents>(eventName: TName, payload: DomainEvents[TName]): boolean;
  emitEvent(eventName: `ats.completed.${string}`, payload: AtsCompletedEvent): boolean;
  emitEvent(eventName: `analytics.refreshed.${string}`, payload: AnalyticsRefreshedEvent): boolean;
  emitEvent(eventName: EventName, payload: DomainEvents[keyof DomainEvents] | AtsCompletedEvent | AnalyticsRefreshedEvent): boolean {
    return this.emit(eventName, payload);
  }

  onEvent<TName extends EventName>(eventName: TName, listener: (payload: EventPayload<TName>) => void): this {
    return this.on(eventName, listener as (...args: unknown[]) => void);
  }

  offEvent<TName extends EventName>(eventName: TName, listener: (payload: EventPayload<TName>) => void): this {
    return this.off(eventName, listener as (...args: unknown[]) => void);
  }
}

export const eventBus = new DomainEventBus();

export const publishResumeOptimized = (resumeId: string, result: OptimizeResult) => {
  eventBus.emitEvent("resume.optimized", { ...baseEvent(), resumeId, result });
};

export const publishJobIngested = (jobId: string, company: string) => {
  eventBus.emitEvent("job.ingested", { ...baseEvent(), jobId, company });
};

export const publishApplicationCreated = (appId: string) => {
  eventBus.emitEvent("application.created", { ...baseEvent(), appId });
};

export const publishAtsCompleted = (jobRecordId: string, result?: unknown) => {
  eventBus.emitEvent(`ats.completed.${jobRecordId}`, { ...baseEvent(), jobRecordId, result });
};

export const publishProviderFailed = (provider: string, error: string) => {
  eventBus.emitEvent("provider.failed", { ...baseEvent(), provider, error });
};

export const publishAnalyticsRefreshed = (userId: string) => {
  eventBus.emitEvent(`analytics.refreshed.${userId}`, { ...baseEvent(), userId });
};
