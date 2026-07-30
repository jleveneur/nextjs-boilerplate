/**
 * Seed CLI: `pnpm --filter @repo/db seed:<tier>`
 *
 * Tiers are separated so test fixtures never ship to production.
 */

import { createDb } from "../client.ts";
import { loadDbEnv } from "../env.ts";
import { seedDev } from "./dev.ts";
import { seedReference } from "./reference.ts";
import { seedTest } from "./test.ts";

const tiers = ["reference", "dev", "test"] as const;
type Tier = (typeof tiers)[number];

function isTier(value: string): value is Tier {
  return (tiers as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const tierArg = process.argv[2];
  if (tierArg === undefined || !isTier(tierArg)) {
    console.error(`Usage: seed <${tiers.join("|")}>`);
    process.exitCode = 1;
    return;
  }

  const env = loadDbEnv();
  const { db, client } = createDb({
    connectionString: env.DATABASE_URL,
    max: 1,
  });

  try {
    // Reference data always runs first — other tiers may assume it exists.
    await seedReference(db);

    if (tierArg === "dev") {
      await seedDev(db);
    } else if (tierArg === "test") {
      await seedTest(db);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
