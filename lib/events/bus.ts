import { EventEmitter } from "events";

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow up to 100 listeners to avoid memory leak warnings on high load
    this.setMaxListeners(100);
  }

  emitEvent(eventName: string, payload: any) {
    this.emit(eventName, payload);
    // Future: if Kafka or NATS is needed, we push payload there
  }
}

// Singleton for the process
export const eventBus = new DomainEventBus();

// Strongly typed event publishers
export const publishResumeOptimized = (resumeId: string, result: any) => {
  eventBus.emitEvent("resume.optimized", { resumeId, result, timestamp: new Date() });
};

export const publishJobIngested = (jobId: string, company: string) => {
  eventBus.emitEvent("job.ingested", { jobId, company, timestamp: new Date() });
};

export const publishApplicationCreated = (appId: string) => {
  eventBus.emitEvent("application.created", { appId, timestamp: new Date() });
};

export const publishAtsCompleted = (jobRecordId: string, payload: any) => {
  eventBus.emitEvent(`ats.completed.${jobRecordId}`, { jobRecordId, ...payload, timestamp: new Date() });
};

export const publishProviderFailed = (provider: string, error: string) => {
  eventBus.emitEvent("provider.failed", { provider, error, timestamp: new Date() });
};

export const publishAnalyticsRefreshed = (userId: string) => {
  eventBus.emitEvent(`analytics.refreshed.${userId}`, { userId, timestamp: new Date() });
};
