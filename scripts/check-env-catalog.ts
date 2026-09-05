/**
 * Asserts the three committed env catalogs list the same keys, in the same
 * order, and that every `@repo/env` preset key appears in that catalog.
 *
 * `.env.example` is the reference for what exists (docs/architecture/09 §5).
 * Staging and production placeholders must not silently drop a variable, and a
 * preset added without a documented entry is incomplete work.
 *
 * Run: node scripts/check-env-catalog.ts
 * Test: node --test scripts/check-env-catalog.test.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { mergePresets } from "../packages/env/src/merge-presets.ts";
import {
  auth,
  base,
  db,
  featureFlags,
  otel,
  posthog,
  posthogClient,
  publicApp,
  redis,
  resend,
  s3,
  sentry,
  sentryClient,
  smtp,
  stripe,
  stripeClient,
} from "../packages/env/src/presets/index.ts";
import { productionProblems } from "../packages/env/src/production.ts";

/** `KEY=value` or `# KEY=value`. Captures whether the line is commented. */
const ASSIGNMENT = /^(?<comment>#\s*)?(?<key>[A-Z][A-Z0-9_]*)=(?<value>.*)$/u;

export type EnvAssignment = {
  key: string;
  value: string;
  commented: boolean;
};

export type EnvCatalogFiles = {
  example: string;
  staging: string;
  production: string;
};

export type EnvCatalogReport = {
  problems: string[];
  keys: string[];
};

/**
 * Keys declared by every composable `@repo/env` preset. Example files may add
 * CI-only or process-local keys; they must not omit these.
 */
export function presetCatalogKeys(): string[] {
  const merged = mergePresets([
    base,
    db,
    redis,
    auth,
    resend,
    smtp,
    s3,
    otel,
    sentry,
    sentryClient,
    posthog,
    posthogClient,
    publicApp,
    featureFlags,
    stripe,
    stripeClient,
  ]);
  // Zod 4 types `ZodObject.shape` as `any`. The runtime value is a field map.
  // oxlint-disable-next-line typescript/no-unsafe-argument
  return Object.keys(merged.shape).toSorted();
}

/** Parses assignment lines, including commented placeholders (`# KEY=`). */
export function parseAssignments(source: string): EnvAssignment[] {
  const assignments: EnvAssignment[] = [];

  for (const raw of source.split(/\r?\n/u)) {
    const match = ASSIGNMENT.exec(raw.trim());
    if (match === null) continue;
    const key = match.groups?.["key"];
    if (key === undefined) continue;
    assignments.push({
      key,
      value: match.groups?.["value"] ?? "",
      commented: match.groups?.["comment"] !== undefined,
    });
  }

  return assignments;
}

/** First-seen assignment keys, in file order. */
export function assignmentKeys(assignments: readonly EnvAssignment[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const assignment of assignments) {
    if (seen.has(assignment.key)) continue;
    seen.add(assignment.key);
    keys.push(assignment.key);
  }
  return keys;
}

function uncommentedMap(assignments: readonly EnvAssignment[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const assignment of assignments) {
    if (assignment.commented) continue;
    env[assignment.key] = assignment.value;
  }
  return env;
}

function firstMismatch(left: readonly string[], right: readonly string[]): string | undefined {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) {
      return `index ${String(index)}: ${left[index] ?? "(missing)"} vs ${right[index] ?? "(missing)"}`;
    }
  }
  return undefined;
}

function requireUncommented(
  env: Readonly<Record<string, string>>,
  key: string,
  expected: string,
  file: string,
): string[] {
  const actual = env[key];
  if (actual === undefined) {
    return [`${file}: ${key} must be set (not commented), expected ${expected}`];
  }
  if (actual !== expected) {
    return [`${file}: ${key} must be ${expected}, got ${actual}`];
  }
  return [];
}

/**
 * Returns catalog problems. Empty array means the three files agree and cover
 * every preset key, and production uncommented values pass production strictness.
 */
export function checkEnvCatalog(
  files: EnvCatalogFiles,
  presetKeys: readonly string[] = presetCatalogKeys(),
): EnvCatalogReport {
  const problems: string[] = [];

  const parsed = {
    ".env.example": parseAssignments(files.example),
    ".env.staging.example": parseAssignments(files.staging),
    ".env.production.example": parseAssignments(files.production),
  };

  for (const [file, assignments] of Object.entries(parsed)) {
    const seen = new Set<string>();
    for (const assignment of assignments) {
      if (seen.has(assignment.key)) {
        problems.push(`${file}: duplicate key ${assignment.key}`);
      }
      seen.add(assignment.key);
    }
  }

  const exampleKeys = assignmentKeys(parsed[".env.example"]);
  const stagingKeys = assignmentKeys(parsed[".env.staging.example"]);
  const productionKeys = assignmentKeys(parsed[".env.production.example"]);

  const stagingMismatch = firstMismatch(exampleKeys, stagingKeys);
  if (stagingMismatch !== undefined) {
    problems.push(`.env.staging.example keys differ from .env.example (${stagingMismatch})`);
  }
  const productionMismatch = firstMismatch(exampleKeys, productionKeys);
  if (productionMismatch !== undefined) {
    problems.push(`.env.production.example keys differ from .env.example (${productionMismatch})`);
  }

  const exampleSet = new Set(exampleKeys);
  for (const key of presetKeys) {
    if (!exampleSet.has(key)) {
      problems.push(`${key}: in @repo/env presets but missing from .env.example`);
    }
  }

  const exampleEnv = uncommentedMap(parsed[".env.example"]);
  const stagingEnv = uncommentedMap(parsed[".env.staging.example"]);
  const productionEnv = uncommentedMap(parsed[".env.production.example"]);

  problems.push(
    ...requireUncommented(exampleEnv, "APP_ENV", "local", ".env.example"),
    ...requireUncommented(exampleEnv, "NODE_ENV", "development", ".env.example"),
    ...requireUncommented(stagingEnv, "APP_ENV", "staging", ".env.staging.example"),
    ...requireUncommented(stagingEnv, "NODE_ENV", "production", ".env.staging.example"),
    ...requireUncommented(productionEnv, "APP_ENV", "production", ".env.production.example"),
    ...requireUncommented(productionEnv, "NODE_ENV", "production", ".env.production.example"),
  );

  for (const problem of productionProblems(productionEnv)) {
    problems.push(`.env.production.example: ${problem}`);
  }

  return { problems, keys: exampleKeys };
}

export async function checkEnvCatalogFromRoot(root: string): Promise<EnvCatalogReport> {
  const [example, staging, production] = await Promise.all([
    readFile(resolve(root, ".env.example"), "utf8"),
    readFile(resolve(root, ".env.staging.example"), "utf8"),
    readFile(resolve(root, ".env.production.example"), "utf8"),
  ]);
  return checkEnvCatalog({ example, staging, production });
}

if (import.meta.main) {
  const report = await checkEnvCatalogFromRoot(resolve(import.meta.dirname, ".."));

  if (report.problems.length > 0) {
    console.error(`\n✗ ${String(report.problems.length)} env catalog problem(s):\n`);
    for (const problem of report.problems) console.error(`  • ${problem}\n`);
    console.error("See docs/architecture/09-environment-and-secrets.md §5\n");
    process.exit(1);
  }

  console.log(`✓ Env catalogs agree (${String(report.keys.length)} keys).`);
}
