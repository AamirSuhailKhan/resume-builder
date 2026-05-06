import { logger } from "./logger";

type MetricTags = Record<string, string | number | boolean>;

/**
 * Metric logging wrapper. In a fully scaled environment, these logs
 * are ingested by Datadog, Prometheus, or CloudWatch via structured log parsing.
 */
export const metrics = {
  increment: (metricName: string, tags?: MetricTags) => {
    logger.info({
      type: "metric",
      metric: metricName,
      value: 1,
      unit: "count",
      ...tags,
    });
  },

  timing: (metricName: string, durationMs: number, tags?: MetricTags) => {
    logger.info({
      type: "metric",
      metric: metricName,
      value: durationMs,
      unit: "milliseconds",
      ...tags,
    });
  },

  gauge: (metricName: string, value: number, tags?: MetricTags) => {
    logger.info({
      type: "metric",
      metric: metricName,
      value,
      unit: "gauge",
      ...tags,
    });
  },
};
