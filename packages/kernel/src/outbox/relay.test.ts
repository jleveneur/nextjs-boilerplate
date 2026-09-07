import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimPendingOutboxEvents,
  markOutboxFailed,
  markOutboxPublished,
  withTransaction,
  type Database,
} from "@repo/db";
import type { OutboxId } from "@repo/types";

import { relayOutboxBatch, type OutboxHandlers } from "./relay.ts";

vi.mock("@repo/db", () => ({
  claimPendingOutboxEvents: vi.fn(),
  markOutboxFailed: vi.fn(),
  markOutboxPublished: vi.fn(),
  // The relay's contract is "everything in one transaction"; the fake just
  // hands the callback a sentinel so the delegation can be asserted.
  withTransaction: vi.fn((_db: unknown, fn: (tx: unknown) => unknown) => fn("tx")),
}));

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double
const db = {} as Database;

function row(id: string, eventType: string, payload: unknown = {}) {
  return { id, eventType, payload };
}

function brand(id: string): OutboxId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OutboxId;
}

describe("relayOutboxBatch", () => {
  beforeEach(() => {
    vi.mocked(claimPendingOutboxEvents).mockReset();
    vi.mocked(markOutboxPublished).mockReset();
    vi.mocked(markOutboxFailed).mockReset();
    vi.mocked(markOutboxPublished).mockResolvedValue();
    vi.mocked(markOutboxFailed).mockResolvedValue();
  });

  it("runs the handler registered for the event type and marks the row published", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([
      row("row-1", "invoice.voided", { invoiceId: "inv-1" }),
    ] as never);

    const handler = vi.fn().mockResolvedValue(undefined);
    const handlers: OutboxHandlers = { "invoice.voided": handler };

    const result = await relayOutboxBatch({ db, handlers, now });

    expect(handler).toHaveBeenCalledWith({
      payload: { invoiceId: "inv-1" },
      outboxId: brand("row-1"),
    });
    expect(markOutboxPublished).toHaveBeenCalledWith("tx", brand("row-1"), now);
    expect(markOutboxFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ claimed: 1, published: 1, failed: 0, skipped: 0 });
  });

  it("skips — and still publishes — a row nothing is registered for", async () => {
    // Otherwise an event type no handler wants would be retried forever.
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([
      row("row-1", "nobody.listens"),
    ] as never);

    const result = await relayOutboxBatch({ db, handlers: {} });

    expect(markOutboxPublished).toHaveBeenCalledOnce();
    expect(result).toEqual({ claimed: 1, published: 0, failed: 0, skipped: 1 });
  });

  it("marks a throwing handler failed with a backoff instead of published", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([
      row("row-1", "invoice.voided"),
    ] as never);

    const handlers: OutboxHandlers = {
      "invoice.voided": vi.fn().mockRejectedValue(new Error("smtp down")),
    };

    const result = await relayOutboxBatch({ db, handlers, now, retryDelayMs: 5000 });

    expect(markOutboxPublished).not.toHaveBeenCalled();
    expect(markOutboxFailed).toHaveBeenCalledWith(
      "tx",
      brand("row-1"),
      "smtp down",
      new Date(now.getTime() + 5000),
    );
    expect(result).toEqual({ claimed: 1, published: 0, failed: 1, skipped: 0 });
  });

  it("keeps processing later rows after one fails", async () => {
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([
      row("row-1", "a"),
      row("row-2", "b"),
    ] as never);

    const good = vi.fn().mockResolvedValue(undefined);
    const handlers: OutboxHandlers = {
      a: vi.fn().mockRejectedValue(new Error("boom")),
      b: good,
    };

    const result = await relayOutboxBatch({ db, handlers });

    expect(good).toHaveBeenCalledOnce();
    expect(result).toEqual({ claimed: 2, published: 1, failed: 1, skipped: 0 });
  });

  it("reports a non-Error throw rather than losing the reason", async () => {
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([row("row-1", "a")] as never);

    const handlers: OutboxHandlers = { a: vi.fn().mockRejectedValue("just a string") };

    await relayOutboxBatch({ db, handlers });

    expect(markOutboxFailed).toHaveBeenCalledWith(
      "tx",
      brand("row-1"),
      "unknown relay error",
      expect.any(Date),
    );
  });

  it("claims a bounded batch inside one transaction", async () => {
    vi.mocked(claimPendingOutboxEvents).mockResolvedValue([] as never);

    await relayOutboxBatch({ db, handlers: {}, limit: 10 });

    expect(withTransaction).toHaveBeenCalledOnce();
    expect(claimPendingOutboxEvents).toHaveBeenCalledWith("tx", 10, expect.any(Date));
  });
});
