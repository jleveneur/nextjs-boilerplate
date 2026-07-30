/**
 * Integration test harness.
 *
 * - Migrations run once against the configured database (or a template DB when
 *   `DATABASE_TEMPLATE_URL` is set — reserved for a later speed pass).
 * - Every test runs inside a transaction that rolls back, so tests are isolated
 *   without truncation.
 * - Factories create only what each test needs.
 */

import { fileURLToPath } from "node:url";

import { TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll } from "vitest";

import { createDb, type Database } from "../client.ts";
import * as schema from "../schema/index.ts";
import type { DbTransaction } from "../with-transaction.ts";
import { createFactories, type Factories } from "./factories.ts";

export type IntegrationTestContext = {
  db: DbTransaction;
  factories: Factories;
};

type Harness = {
  /** Root database (outside a test transaction). Prefer {@link withTestTransaction}. */
  db: Database;
  withTestTransaction: (fn: (ctx: IntegrationTestContext) => Promise<void>) => Promise<void>;
};

let harness: Harness | undefined;

function requireDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url === "") {
    throw new Error(
      "DATABASE_URL is required for @repo/db integration tests. Start Postgres with `make db-up` and export DATABASE_URL.",
    );
  }

  return url;
}

/**
 * Registers Vitest lifecycle hooks and returns helpers for the suite.
 *
 * Call once at the top of an integration test file (or a shared setup module).
 */
export function setupDbIntegrationTests(): Harness {
  if (harness !== undefined) {
    return harness;
  }

  const connectionString = requireDatabaseUrl();
  const { db, client } = createDb({ connectionString, max: 5 });

  beforeAll(async () => {
    // Migrate with a dedicated single-connection client so the migrator lock
    // is not shared with the suite pool.
    const migrationClient = postgres(connectionString, { max: 1 });
    try {
      await migrate(drizzle(migrationClient, { schema }), {
        migrationsFolder: fileURLToPath(new URL("../../migrations", import.meta.url)),
      });
    } finally {
      await migrationClient.end();
    }
  }, 60_000);

  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  const current: Harness = {
    db,
    async withTestTransaction(fn) {
      // Force a rollback after the test body so fixtures never persist.
      // postgres-js does not swallow TransactionRollbackError the way some
      // other drivers do, so we catch it here.
      try {
        await db.transaction(async (tx) => {
          const factories = createFactories(tx);
          await fn({ db: tx, factories });
          tx.rollback();
        });
      } catch (error) {
        if (error instanceof TransactionRollbackError) {
          return;
        }
        throw error;
      }
    },
  };

  harness = current;
  return current;
}
