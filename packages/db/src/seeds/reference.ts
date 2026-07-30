/**
 * Reference seed — required lookup data for every environment.
 *
 * Keep this empty until a real lookup table exists. The tier is wired so
 * production deploys have a place to put non-secret reference rows without
 * pulling in `seed:dev` fixtures.
 */

import type { Database } from "../client.ts";

export async function seedReference(_db: Database): Promise<void> {
  // No reference rows yet. Intentionally a no-op so `make db-reset` has a
  // stable, environment-safe seed step from day one.
}
