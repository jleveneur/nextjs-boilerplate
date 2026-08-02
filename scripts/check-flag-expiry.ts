/**
 * Fails CI when a non-permanent feature flag has passed its `expires` date.
 *
 * Without this check, flags accumulate forever and every one doubles the number
 * of code paths that theoretically exist and are never tested.
 *
 * Run: node scripts/check-flag-expiry.ts
 */

import { listExpiredFlags } from "../packages/flags/src/expiry.ts";

if (import.meta.main) {
  const expired = listExpiredFlags(new Date());

  if (expired.length > 0) {
    console.error(`\n✗ ${String(expired.length)} expired feature flag(s):\n`);
    for (const flag of expired) {
      console.error(
        `  • ${flag.name} (${flag.kind}) expired ${flag.expires} — owner ${flag.owner}\n`,
      );
    }
    console.error("Remove or extend the flag in packages/flags/src/registry.ts\n");
    process.exit(1);
  }

  console.log("✓ No expired feature flags.");
}
