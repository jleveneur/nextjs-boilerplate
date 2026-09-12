import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@repo/env";

import * as schema from "./schema.ts";

/**
 * The database handle.
 *
 * One pool per process, opened lazily — postgres.js does not connect until the
 * first query, so importing this module is free. `idle_timeout` bounds what the
 * dev server accumulates across hot reloads, which would otherwise exhaust
 * Postgres's connection limit over a long session.
 *
 * `max: 10` assumes a long-running server: a container, a VM, a single Node
 * process. On a serverless platform every warm instance holds its own pool, so
 * ten instances mean a hundred connections and Postgres starts refusing them.
 * Deploying to Vercel, Lambda, or Cloud Run means either putting a pooler in
 * front (PgBouncer, or the one Neon and Supabase provide) and pointing
 * `DATABASE_URL` at it, or dropping `max` to 1 and accepting the round trip.
 */
const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

export { schema };
export * from "./schema.ts";
