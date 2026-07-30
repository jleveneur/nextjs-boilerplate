/** Product analytics sink. Real providers arrive with `@repo/analytics` (Phase 14). */
export type AnalyticsSink = {
  capture(event: string, properties?: Record<string, unknown>): Promise<void>;
};
