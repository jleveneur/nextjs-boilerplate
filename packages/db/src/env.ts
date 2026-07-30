/**
 * Environment for migrate/seed scripts.
 *
 * Uses `@repo/env/shared` rather than `@repo/env/server` so scripts run under
 * Node's default export condition (workers and CLIs are not Next RSC).
 */

import { createEnv } from "@repo/env/shared";
import { base, db } from "@repo/env/presets";

export function loadDbEnv() {
  return createEnv({
    server: [base, db],
  });
}
