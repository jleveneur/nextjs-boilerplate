/**
 * Database restore drill (Phase 16).
 *
 * pg_dump the local app DB → restore into a scratch database → run migrations →
 * smoke query → drop scratch. Proves the dump/restore tooling path; adopters
 * with managed PITR still run a real restore into a scratch project monthly
 * (see docs/runbooks/restore.md).
 *
 * Usage: make restore-drill
 * Requires: docker compose postgres from `make deps-up` (host port 55432).
 */

import { execFileSync } from "node:child_process";

const COMPOSE = ["docker", "compose", "-f", "docker/compose.yaml"] as const;
const SCRATCH_DB = "app_restore_drill";
const SOURCE_DB = process.env["RESTORE_SOURCE_DB"] ?? "app";

function composeExec(args: string[], options?: { input?: string }): string {
  return execFileSync(COMPOSE[0], [...COMPOSE.slice(1), "exec", "-T", "postgres", ...args], {
    encoding: "utf8",
    input: options?.input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function psql(sql: string): string {
  return composeExec(["psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql]);
}

function main(): void {
  console.log(`• Restore drill: dump "${SOURCE_DB}" → "${SCRATCH_DB}"`);

  // Ensure postgres is up.
  try {
    composeExec(["pg_isready", "-U", "postgres", "-d", SOURCE_DB]);
  } catch {
    console.error("✗ Postgres not ready. Run: make deps-up");
    process.exit(1);
  }

  psql(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${SCRATCH_DB}' AND pid <> pg_backend_pid();`,
  );
  psql(`DROP DATABASE IF EXISTS ${SCRATCH_DB};`);
  psql(`CREATE DATABASE ${SCRATCH_DB};`);

  const dump = composeExec(["pg_dump", "-U", "postgres", "--no-owner", "--no-acl", SOURCE_DB]);
  composeExec(["psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-d", SCRATCH_DB], {
    input: dump,
  });

  // Schema should already match; re-running migrate is a no-op when at head.
  const scratchUrl = `postgres://postgres:postgres@127.0.0.1:55432/${SCRATCH_DB}`;
  execFileSync("pnpm", ["--filter", "@repo/db", "exec", "tsx", "src/migrate.ts"], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: scratchUrl },
    stdio: "inherit",
  });

  const smoke = composeExec([
    "psql",
    "-U",
    "postgres",
    "-d",
    SCRATCH_DB,
    "-v",
    "ON_ERROR_STOP=1",
    "-tAc",
    "SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public';",
  ]).trim();

  const tableCount = Number(smoke);
  if (!Number.isFinite(tableCount) || tableCount < 1) {
    console.error(`✗ Smoke failed: expected public tables, got ${smoke}`);
    process.exit(1);
  }

  psql(`DROP DATABASE IF EXISTS ${SCRATCH_DB};`);
  console.log(`✓ Restore drill passed (${String(tableCount)} public tables in scratch DB)`);
}

main();
