/**
 * Apply pending Drizzle migrations against a database URL.
 *
 * Callers resolve `migrationsFolder` (host script vs api image layout) and
 * load env at their edge. Never invoked from application boot.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export { loadDbEnv } from "./env.ts";

export type RunMigrationsOptions = {
  databaseUrl: string;
  migrationsFolder: string;
};

export async function runMigrations(options: RunMigrationsOptions): Promise<void> {
  const client = postgres(options.databaseUrl, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: options.migrationsFolder });
  } finally {
    await client.end();
  }
}
