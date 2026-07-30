/**
 * Nested-safe transaction helper.
 *
 * The first call opens a transaction and stores it in AsyncLocalStorage. Nested
 * calls reuse that transaction instead of opening a second connection — which
 * is how a repository called from inside a service transaction would otherwise
 * deadlock against itself.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import type { Database } from "./client.ts";

export type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | DbTransaction;

const transactionStorage = new AsyncLocalStorage<DbTransaction>();

/** The active transaction, if `withTransaction` is on the call stack. */
export function getTransaction(): DbTransaction | undefined {
  return transactionStorage.getStore();
}

/**
 * Prefer the active transaction when present, otherwise the root connection.
 *
 * Repository helpers that accept a bare `Database` should resolve through this
 * so they automatically join an open transaction.
 */
export function resolveDb(db: Database): DbExecutor {
  return getTransaction() ?? db;
}

/**
 * Runs `fn` inside a transaction, joining an existing one when nested.
 */
export async function withTransaction<T>(
  db: Database,
  fn: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  const existing = transactionStorage.getStore();
  if (existing !== undefined) {
    return fn(existing);
  }

  return db.transaction(async (tx) => transactionStorage.run(tx, () => fn(tx)));
}
