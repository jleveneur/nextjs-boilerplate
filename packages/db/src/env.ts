/**
 * Environment for migrate/seed scripts.
 *
 * Uses `@repo/env/shared` rather than `@repo/env/server` so scripts run under
 * Node's default export condition (workers and CLIs are not Next RSC).
 */

import { base, db } from "@repo/env/presets";
import { createEnv } from "@repo/env/shared";

export function loadDbEnv() {
  return createEnv({
    server: [base, db],
  });
}
