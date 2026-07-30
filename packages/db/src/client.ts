/**
 * Database client factory.
 *
 * Connection string and pool size come from the caller (composition root or
 * script). Query logging is injected so this package never depends on
 * `@repo/logger` — both are layer 1 (ADR-0002).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";

/** Default statement timeout: an unbounded query is an outage. */
export const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

/** Default idle-in-transaction timeout: a leaked transaction holds locks. */
export const DEFAULT_IDLE_IN_TRANSACTION_TIMEOUT_MS = 30_000;

/** Default pool size per process — see docs/architecture/06-data-and-storage.md. */
export const DEFAULT_POOL_SIZE = 10;

export type QueryLogEvent = {
  sql: string;
  params: unknown[];
  durationMs: number;
};

export type CreateDbOptions = {
  connectionString: string;
  /** Max connections in this process. Defaults to {@link DEFAULT_POOL_SIZE}. */
  max?: number;
  statementTimeoutMs?: number;
  idleInTransactionTimeoutMs?: number;
  /** Optional query logger. Injected from the composition root. */
  logQuery?: (event: QueryLogEvent) => void;
};

export type Database = ReturnType<typeof createDb>["db"];
export type SqlClient = ReturnType<typeof createDb>["client"];

/**
 * Opens a postgres.js pool and wraps it in Drizzle with the app schema.
 *
 * Call `client.end()` on shutdown. Do not share one pool across unrelated
 * processes — each Node process owns its pool.
 */
export function createDb(options: CreateDbOptions) {
  const max = options.max ?? DEFAULT_POOL_SIZE;
  const statementTimeoutMs = options.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS;
  const idleInTransactionTimeoutMs =
    options.idleInTransactionTimeoutMs ?? DEFAULT_IDLE_IN_TRANSACTION_TIMEOUT_MS;

  const client = postgres(options.connectionString, {
    max,
    // postgres.js accepts timeouts in seconds for connect; session GUCs below
    // are milliseconds, matching Postgres's own units for these settings.
    connect_timeout: 10,
    connection: {
      statement_timeout: statementTimeoutMs,
      idle_in_transaction_session_timeout: idleInTransactionTimeoutMs,
    },
    onnotice: () => {
      // Suppress NOTICE noise in tests and scripts; apps can attach a logger
      // via logQuery for the statements that matter.
    },
  });

  const logQuery = options.logQuery;
  const db =
    logQuery === undefined
      ? drizzle(client, { schema })
      : drizzle(client, {
          schema,
          logger: {
            logQuery(query: string, params: unknown[]) {
              logQuery({
                sql: query,
                params,
                // Drizzle's logger has no duration; 0 means "unknown".
                durationMs: 0,
              });
            },
          },
        });

  return { db, client };
}
