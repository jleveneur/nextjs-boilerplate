import { describe, expect, it, vi } from "vitest";

import {
  getTransaction,
  resolveDb,
  withTransaction,
  type DbTransaction,
} from "./with-transaction.ts";

describe("withTransaction", () => {
  it("opens a transaction when none is active", async () => {
    const tx = { tag: "tx" } as unknown as DbTransaction;
    const transaction = vi.fn((fn: (tx: DbTransaction) => Promise<string>) => fn(tx));
    const db = { transaction } as unknown as Parameters<typeof withTransaction>[0];

    const result = await withTransaction(db, (active) => {
      expect(active).toBe(tx);
      expect(getTransaction()).toBe(tx);
      expect(resolveDb(db)).toBe(tx);
      return Promise.resolve("ok");
    });

    expect(result).toBe("ok");
    expect(transaction).toHaveBeenCalledOnce();
    expect(getTransaction()).toBeUndefined();
    expect(resolveDb(db)).toBe(db);
  });

  it("joins an existing transaction instead of opening another", async () => {
    const outerTx = { tag: "outer" } as unknown as DbTransaction;
    const transaction = vi.fn((fn: (tx: DbTransaction) => Promise<void>) => fn(outerTx));
    const db = { transaction } as unknown as Parameters<typeof withTransaction>[0];

    await withTransaction(db, async () => {
      await withTransaction(db, (inner) => {
        expect(inner).toBe(outerTx);
        return Promise.resolve();
      });
    });

    expect(transaction).toHaveBeenCalledOnce();
  });
});
