// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { capture } from "./capture.ts";
export { subscribeToAnalytics } from "./domain-subscriber.ts";
export type { AnalyticsDomainEvent, AnalyticsEventBus } from "./domain-subscriber.ts";
export { createMemoryAnalyticsSink, type RecordedAnalyticsEvent } from "./memory-sink.ts";
export { createNoopAnalyticsSink } from "./noop-sink.ts";
export {
  createPostHogAnalyticsSink,
  type CreatePostHogAnalyticsSinkOptions,
} from "./posthog-sink.ts";
export type { AnalyticsSink } from "./types.ts";
