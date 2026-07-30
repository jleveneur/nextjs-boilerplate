/**
 * Apply pending Drizzle migrations.
 *
 * Migrations never run on application boot — this script (or the CD migrate
 * job) is the only path that applies them.
 */

import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { loadDbEnv } from "./env.ts";

async function main(): Promise<void> {
  const env = loadDbEnv();
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  // Scripts are a documented console exception (AGENTS.md §4).
  console.error(error);
  process.exitCode = 1;
});
