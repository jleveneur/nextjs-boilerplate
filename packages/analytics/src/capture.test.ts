import { describe, expect, it } from "vitest";

import { capture } from "./capture.ts";
import { createMemoryAnalyticsSink } from "./memory-sink.ts";
import { createNoopAnalyticsSink } from "./noop-sink.ts";
import { subscribeToAnalytics, type AnalyticsEventBus } from "./domain-subscriber.ts";

function createTestBus(): AnalyticsEventBus & {
  emit: (event: { type: string; payload: unknown; occurredAt: Date }) => Promise<void>;
} {
  const handlers = new Map<
    string,
    Array<(event: { type: string; payload: unknown; occurredAt: Date }) => void | Promise<void>>
  >();

  return {
    subscribe(type, handler) {
      const list = handlers.get(type) ?? [];
      list.push(handler);
      handlers.set(type, list);
      return () => {
        const current = handlers.get(type) ?? [];
        handlers.set(
          type,
          current.filter((h) => h !== handler),
        );
      };
    },
    async emit(event) {
      const list = handlers.get(event.type) ?? [];
      for (const handler of list) {
        await handler(event);
      }
    },
  };
}

describe("capture", () => {
  it("validates properties and forwards to the sink", async () => {
    const sink = createMemoryAnalyticsSink();

    await capture(sink, "user.signed_up", { method: "oauth" });

    expect(sink.events).toEqual([{ event: "user.signed_up", properties: { method: "oauth" } }]);
  });

  it("rejects malformed properties", async () => {
    const sink = createMemoryAnalyticsSink();

    await expect(
      // @ts-expect-error — intentional invalid payload for runtime check
      capture(sink, "user.signed_up", { method: "sms" }),
    ).rejects.toThrow();
    expect(sink.events).toHaveLength(0);
  });

  it("records invoice.voided with minor units", async () => {
    const sink = createMemoryAnalyticsSink();

    await capture(sink, "invoice.voided", {
      invoiceId: "inv_1",
      organizationId: "org_1",
      amountMinor: 12_50,
      currency: "eur",
    });

    expect(sink.events[0]?.properties).toEqual({
      invoiceId: "inv_1",
      organizationId: "org_1",
      amountMinor: 12_50,
      currency: "eur",
    });
  });
});

describe("createMemoryAnalyticsSink", () => {
  it("records events in order", async () => {
    const sink = createMemoryAnalyticsSink();

    await sink.capture("a", { n: 1 });
    await sink.capture("b");

    expect(sink.events).toEqual([{ event: "a", properties: { n: 1 } }, { event: "b" }]);
  });

  it("flush and shutdown are no-ops", async () => {
    const sink = createMemoryAnalyticsSink();
    await expect(sink.flush()).resolves.toBeUndefined();
    await expect(sink.shutdown()).resolves.toBeUndefined();
  });
});

describe("createNoopAnalyticsSink", () => {
  it("swallows captures", async () => {
    const sink = createNoopAnalyticsSink();
    await expect(sink.capture("ignored", { x: 1 })).resolves.toBeUndefined();
  });

  it("flush and shutdown are no-ops", async () => {
    const sink = createNoopAnalyticsSink();
    await expect(sink.flush()).resolves.toBeUndefined();
    await expect(sink.shutdown()).resolves.toBeUndefined();
  });
});

describe("subscribeToAnalytics", () => {
  it("maps invoice.voided and asset.confirmed domain events", async () => {
    const bus = createTestBus();
    const sink = createMemoryAnalyticsSink();
    const unsubscribe = subscribeToAnalytics(bus, sink);

    await bus.emit({
      type: "invoice.voided",
      payload: {
        invoiceId: "inv_1",
        organizationId: "org_1",
        amountMinor: 100,
        currency: "usd",
        outboxId: "out_1",
      },
      occurredAt: new Date(),
    });

    await bus.emit({
      type: "asset.confirmed",
      payload: {
        assetId: "asset_1",
        organizationId: "org_1",
        outboxId: "out_2",
      },
      occurredAt: new Date(),
    });

    expect(sink.events).toEqual([
      {
        event: "invoice.voided",
        properties: {
          invoiceId: "inv_1",
          organizationId: "org_1",
          amountMinor: 100,
          currency: "usd",
        },
      },
      {
        event: "asset.confirmed",
        properties: {
          assetId: "asset_1",
          organizationId: "org_1",
        },
      },
    ]);

    unsubscribe();
  });

  it("skips payloads that do not match the analytics schema", async () => {
    const bus = createTestBus();
    const sink = createMemoryAnalyticsSink();
    subscribeToAnalytics(bus, sink);

    await bus.emit({
      type: "invoice.voided",
      payload: { invoiceId: "inv_1" },
      occurredAt: new Date(),
    });

    expect(sink.events).toHaveLength(0);
  });
});
