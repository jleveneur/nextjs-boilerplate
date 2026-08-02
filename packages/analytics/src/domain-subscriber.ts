/**
 * Domain-event → analytics bridge.
 *
 * Services emit domain events; this subscriber translates them. Analytics adds
 * no lines to business logic and can be removed without touching core.
 *
 * The bus shape is local so this layer-1 package does not depend on `@repo/core`
 * (layer 2).
 */

import { capture } from "./capture.ts";
import { events } from "./events.ts";
import type { AnalyticsSink } from "./types.ts";

export type AnalyticsDomainEvent = {
  type: string;
  payload: unknown;
  occurredAt: Date;
};

export type AnalyticsEventBus = {
  subscribe(
    type: string,
    handler: (event: AnalyticsDomainEvent) => void | Promise<void>,
  ): () => void;
};

const DOMAIN_ANALYTICS_MAPPINGS = [
  { domainType: "invoice.voided", analyticsName: "invoice.voided" },
  { domainType: "asset.confirmed", analyticsName: "asset.confirmed" },
] as const satisfies ReadonlyArray<{
  domainType: string;
  analyticsName: keyof typeof events;
}>;

/**
 * Subscribes to domain events that have a matching analytics registry entry and
 * captures them. Returns an unsubscribe that tears down every subscription.
 */
export function subscribeToAnalytics(bus: AnalyticsEventBus, sink: AnalyticsSink): () => void {
  const unsubscribers: Array<() => void> = [];

  for (const { domainType, analyticsName } of DOMAIN_ANALYTICS_MAPPINGS) {
    const schema = events[analyticsName];
    unsubscribers.push(
      bus.subscribe(domainType, async (event) => {
        const parsed = schema.safeParse(event.payload);
        if (!parsed.success) {
          return;
        }
        await capture(sink, analyticsName, parsed.data);
      }),
    );
  }

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
}
