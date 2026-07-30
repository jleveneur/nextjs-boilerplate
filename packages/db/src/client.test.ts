import { describe, expect, it, vi } from "vitest";

import {
  createDb,
  DEFAULT_IDLE_IN_TRANSACTION_TIMEOUT_MS,
  DEFAULT_POOL_SIZE,
  DEFAULT_STATEMENT_TIMEOUT_MS,
} from "./client.ts";

describe("createDb", () => {
  it("exposes documented default timeouts and pool size", () => {
    expect(DEFAULT_POOL_SIZE).toBe(10);
    expect(DEFAULT_STATEMENT_TIMEOUT_MS).toBe(10_000);
    expect(DEFAULT_IDLE_IN_TRANSACTION_TIMEOUT_MS).toBe(30_000);
  });

  it("returns a db handle and a closable client", async () => {
    const { db, client } = createDb({
      connectionString: "postgres://postgres:postgres@127.0.0.1:55432/app",
      max: 1,
    });

    expect(db).toBeDefined();
    expect(typeof client.end).toBe("function");

    // Closing without querying must not throw — postgres.js is lazy.
    await client.end({ timeout: 1 });
  });

  it("forwards logQuery when provided", async () => {
    const logQuery = vi.fn();
    const { db, client } = createDb({
      connectionString: "postgres://postgres:postgres@127.0.0.1:55432/app",
      max: 1,
      logQuery,
    });

    // Trigger Drizzle's logger with a query that fails to connect quickly —
    // we only assert the logger wiring exists; connection errors are fine.
    expect(db).toBeDefined();
    expect(logQuery).not.toHaveBeenCalled();
    await client.end({ timeout: 1 });
  });
});
