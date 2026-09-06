/**
 * Prints what a new project would remove to drop an optional subsystem.
 *
 * This repo is a starting point, so the first thing anyone does with it is
 * delete the parts they do not need. That should not require reverse-engineering
 * the package graph: the commerce example alone reaches ~45 files across 20
 * packages, because the closed registries that make the architecture coherent
 * (one id union, one error-code table, one permission registry, one job registry)
 * are exactly what a feature has to register itself in.
 *
 * The entanglement is a consequence of the design, not a defect in it, so this
 * does not try to automate the removal — a script that edits 45 files by regex
 * would be wrong the first time anyone refactored. It computes the inventory
 * instead, from the tree as it is now, so the list cannot go stale.
 *
 * Run: node scripts/example-inventory.ts [feature…]
 * Test: node --test scripts/example-inventory.test.ts
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export type Feature = {
  /** One line: what the subsystem is. */
  summary: string;
  /**
   * Set when the subsystem degrades to a no-op with no configuration, in which
   * case not setting the env is a complete answer and deleting is optional.
   */
  optionalAtRuntime?: string;
  /** Paths that exist only for this subsystem and are deleted whole. */
  owns: readonly string[];
  /** Identifies references to this subsystem in files it does not own. */
  mentions: RegExp;
  /** Workspace packages deleted with it, so importers can be found exactly. */
  packages?: readonly string[];
  /** Env keys that become dead once it is gone. */
  envKeys?: readonly string[];
};

export const FEATURES: Readonly<Record<string, Feature>> = {
  billing: {
    summary: "Invoices, Stripe subscriptions, entitlements — the worked domain example.",
    optionalAtRuntime:
      "createPaymentGateway falls back to a no-op when STRIPE_SECRET_KEY is unset, so the app " +
      "already boots without Stripe. Deleting removes dead surface; it does not fix a break.",
    owns: [
      "packages/payments",
      "packages/core/src/billing",
      "packages/core/src/subscription",
      "packages/core/src/ports/payment-gateway.ts",
      "packages/orpc/src/routers/billing.ts",
      "packages/contracts/src/invoice.ts",
      "packages/contracts/src/invoice.test.ts",
      "packages/contracts/src/invoice-rest.ts",
      "packages/contracts/src/invoice-rest.test.ts",
      "packages/db/src/schema/invoice.sql.ts",
      "packages/db/src/schema/subscription.sql.ts",
      "packages/db/src/schema/entitlement.sql.ts",
      "packages/db/src/schema/stripe-catalog.sql.ts",
      "packages/db/src/schema/stripe-customer.sql.ts",
      "apps/api/src/routes",
      "apps/api/src/webhooks",
      "apps/web/src/features/billing",
      "apps/web/src/app/[locale]/(app)/[orgSlug]/invoices",
      "apps/web/src/app/[locale]/(app)/[orgSlug]/billing",
      "apps/web/e2e/billing.spec.ts",
      "apps/web/e2e/billing-stripe.spec.ts",
      "apps/worker/src/consumers/invoice-voided-notify.ts",
      "apps/worker/src/consumers/invoice-voided-notify.test.ts",
      "apps/worker/src/consumers/stripe-event-process.ts",
      "apps/worker/src/consumers/stripe-event-process.test.ts",
    ],
    mentions: /invoice|stripe|entitlement/i,
    packages: ["@repo/payments"],
    envKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  },

  assets: {
    summary: "S3/MinIO uploads, presigned URLs, and image derivatives.",
    optionalAtRuntime:
      "The file-store port has an in-memory implementation, but the app wires the S3 adapter " +
      "directly, so removing this is a real edit rather than an unset variable.",
    owns: [
      "packages/core/src/assets",
      "packages/db/src/schema/asset.sql.ts",
      "packages/db/src/repositories/asset.repository.ts",
      "apps/worker/src/consumers/image-derive.ts",
      "apps/worker/src/consumers/asset-reconcile.ts",
      "apps/worker/src/consumers/asset-reconcile.test.ts",
    ],
    mentions: /\basset/i,
    packages: ["@repo/storage"],
    envKeys: ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  },

  analytics: {
    summary: "PostHog product analytics and the typed domain-event subscriber.",
    optionalAtRuntime:
      "A no-op sink is used whenever POSTHOG_API_KEY is unset. Leaving it in costs nothing.",
    owns: ["packages/analytics"],
    mentions: /posthog|analytics/i,
    packages: ["@repo/analytics"],
    envKeys: [
      "POSTHOG_API_KEY",
      "POSTHOG_HOST",
      "NEXT_PUBLIC_POSTHOG_KEY",
      "NEXT_PUBLIC_POSTHOG_HOST",
    ],
  },

  docsSite: {
    summary:
      "The Fumadocs documentation website. The markdown in docs/ renders on GitHub without it.",
    owns: ["apps/docs"],
    packages: ["@repo/docs"],
    mentions: /@repo\/docs/,
  },

  publicApi: {
    summary:
      "The public REST/OpenAPI transport. Drop it if only your own web app calls the domain.",
    owns: ["apps/api"],
    packages: ["@repo/api"],
    mentions: /@repo\/api\b/,
  },
} as const;

function trackedFiles(): readonly string[] {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((line) => line !== "");
}

function isOwned(file: string, owns: readonly string[]): boolean {
  return owns.some((path) => file === path || file.startsWith(`${path}/`));
}

/**
 * Contents of every tracked file, read once.
 *
 * The obvious implementation shells out per file; at ~800 tracked files that is
 * ~800 process spawns per query and made the script suite take 27 seconds.
 */
const sourceCache = new Map<string, string>();

function readTracked(file: string): string {
  const cached = sourceCache.get(file);
  if (cached !== undefined) {
    return cached;
  }

  let source = "";
  try {
    source = readFileSync(resolve(ROOT, file), "utf8");
  } catch {
    // Deleted in the working tree but still indexed — nothing to scan.
  }
  sourceCache.set(file, source);
  return source;
}

function mentionsFeature(file: string, feature: Feature): boolean {
  return feature.mentions.test(readTracked(file));
}

/**
 * Files whose imports resolve into the deleted code — guaranteed to break.
 *
 * This is the difference between "mentions the word invoice" and "will not
 * compile", and it is the list worth working from first.
 */
export function brokenImporters(
  feature: Feature,
  files: readonly string[] = trackedFiles(),
): readonly string[] {
  const targets = [...(feature.packages ?? []), ...feature.owns];

  return files.filter((file) => {
    if (!/^(?:packages|apps)\/.*\.(?:ts|tsx)$/.test(file) || isOwned(file, feature.owns)) {
      return false;
    }

    return [...readTracked(file).matchAll(/from\s+"([^"]+)"/gu)].some(([, specifier = ""]) => {
      if (feature.packages?.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))) {
        return true;
      }
      // Relative imports: resolve against the importing file's directory.
      if (!specifier.startsWith(".")) {
        return false;
      }
      const resolved = resolve("/", file, "..", specifier)
        .slice(1)
        .replace(/\.ts x?$/u, "");
      return targets.some((target) => resolved === target || resolved.startsWith(`${target}/`));
    });
  });
}

/**
 * Source that names the feature without importing it — labels, fixtures, routes.
 *
 * Mostly cosmetic, but it is where a stale nav link or a seed row hides.
 */
export function sharedReferences(
  feature: Feature,
  files: readonly string[] = trackedFiles(),
): readonly string[] {
  return files.filter(
    (file) =>
      /^(?:packages|apps)\/.*\.(?:ts|tsx)$/.test(file) &&
      !isOwned(file, feature.owns) &&
      mentionsFeature(file, feature),
  );
}

/** Prose and fixtures that merely name the feature. Read once, fix at leisure. */
export function proseReferences(
  feature: Feature,
  files: readonly string[] = trackedFiles(),
): readonly string[] {
  const history = /^(?:.*CHANGELOG\.md|packages\/db\/migrations\/|\.changeset\/)/;

  return files.filter(
    (file) =>
      /\.(?:mdx?|json|ya?ml)$/.test(file) &&
      !history.test(file) &&
      !isOwned(file, feature.owns) &&
      mentionsFeature(file, feature),
  );
}

/** Declared paths that no longer exist — the manifest has rotted. */
export function stalePaths(feature: Feature): readonly string[] {
  return feature.owns.filter((path) => !existsSync(resolve(ROOT, path)));
}

function report(name: string, feature: Feature): void {
  console.log(`\n\x1b[1m${name}\x1b[0m — ${feature.summary}`);

  if (feature.optionalAtRuntime !== undefined) {
    console.log(`  note: ${feature.optionalAtRuntime}`);
  }

  const stale = stalePaths(feature);
  if (stale.length > 0) {
    console.log(`  \x1b[33mno longer present:\x1b[0m ${stale.join(", ")}`);
  }

  const owned = feature.owns.filter((path) => !stale.includes(path));
  console.log(`\n  Delete outright (${owned.length}):`);
  for (const path of owned) {
    console.log(`    ${path}`);
  }

  const broken = brokenImporters(feature);
  console.log(`\n  Will not compile until fixed (${broken.length}):`);
  for (const file of broken) {
    console.log(`    ${file}`);
  }

  const brokenSet = new Set(broken);
  const shared = sharedReferences(feature).filter((file) => !brokenSet.has(file));
  console.log(`\n  Names it without importing it — labels, fixtures, routes (${shared.length}):`);
  for (const file of shared) {
    console.log(`    ${file}`);
  }

  const prose = proseReferences(feature);
  console.log(`\n  Prose and fixtures naming it (${prose.length}, not build-breaking):`);
  for (const file of prose) {
    console.log(`    ${file}`);
  }

  if (feature.envKeys !== undefined) {
    console.log(`\n  Env keys to drop from the catalogs: ${feature.envKeys.join(", ")}`);
  }
}

function main(): void {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const names = requested.length > 0 ? requested : Object.keys(FEATURES);

  for (const name of names) {
    const feature = FEATURES[name];
    if (feature === undefined) {
      console.error(`Unknown feature: ${name}. Known: ${Object.keys(FEATURES).join(", ")}`);
      process.exitCode = 1;
      return;
    }
    report(name, feature);
  }

  console.log("\nSee docs/starting-a-project.md for the order to do this in.\n");
}

if (process.argv[1] === import.meta.filename) {
  main();
}
