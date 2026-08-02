/**
 * Production migrate entry for the api OCI image.
 *
 * Same image as the API server; CD / compose override the command to
 * `node dist/migrate.mjs` and wait for exit 0 before rolling apps.
 * Migrations never run when the default CMD starts the HTTP server.
 */

import { fileURLToPath } from "node:url";

import { loadDbEnv, runMigrations } from "@repo/db/migrate";

async function main(): Promise<void> {
  const env = loadDbEnv();
  // Bundled to /app/dist/migrate.mjs; SQL is copied to /app/migrations.
  const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
  await runMigrations({
    databaseUrl: env.DATABASE_URL,
    migrationsFolder,
  });
}

main().catch((error: unknown) => {
  // Scripts are a documented console exception (AGENTS.md §4).
  console.error(error);
  process.exitCode = 1;
});
