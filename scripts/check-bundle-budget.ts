/**
 * Asserts per-route First Load JS budgets for `apps/web` after `next build`.
 *
 * Next 16 (Turbopack) no longer prints a stable "First Load JS" table, so we
 * derive the same figure from `.next` manifests:
 *   rootMainFiles + polyfillFiles + the route's entryJSFiles
 *
 * Budgets live in `apps/web/bundle-budget.json`. The `/` route also forbids
 * heavy module path substrings so chart/editor/table (and the design-system
 * client graph) cannot land on the base route unnoticed.
 *
 * Run: pnpm --filter @repo/web bundle-budget
 * Test: node --test scripts/check-bundle-budget.test.ts
 */

import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export type RouteBudget = {
  maxFirstLoadJsBytes: number;
  forbiddenModuleSubstrings?: string[];
  /**
   * Path under `.next/` to the route's client-reference-manifest.js.
   * Required for App Router routes that use `[locale]` / route groups.
   */
  manifestPath?: string;
  /**
   * Suffix matched against entryJSFiles keys (e.g. `/[locale]/(marketing)/page`).
   * Defaults to a guess from the public route string.
   */
  entrySuffix?: string;
};

export type BundleBudgetFile = {
  routes: Record<string, RouteBudget>;
};

export type BuildManifest = {
  rootMainFiles: string[];
  polyfillFiles: string[];
};

export type BudgetProblem = string;

export type BudgetReport = {
  problems: BudgetProblem[];
  measured: Record<string, number>;
};

/** Strip the `/_next/` prefix Next puts on some chunk paths. */
export function normalizeChunkPath(path: string): string {
  return path.replace(/^\/_next\//, "");
}

/**
 * Pull the `entryJSFiles` map out of a client-reference-manifest.js file.
 * The file is JS, not JSON — we extract the object literal by brace matching.
 */
export function parseEntryJsFiles(manifestSource: string): Record<string, string[]> {
  const marker = `"entryJSFiles":`;
  const idx = manifestSource.indexOf(marker);
  if (idx === -1) {
    throw new Error("client-reference-manifest is missing entryJSFiles");
  }

  let i = idx + marker.length;
  while (i < manifestSource.length && manifestSource[i] !== "{") i += 1;
  if (i >= manifestSource.length) {
    throw new Error("entryJSFiles object not found");
  }

  let depth = 0;
  const start = i;
  for (; i < manifestSource.length; i += 1) {
    const ch = manifestSource[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const raw: unknown = JSON.parse(manifestSource.slice(start, i + 1));
        if (!isRecord(raw)) {
          throw new Error("entryJSFiles is not an object");
        }
        const out: Record<string, string[]> = {};
        for (const [key, value] of Object.entries(raw)) {
          const chunks = asStringArray(value);
          if (chunks === undefined) {
            throw new Error(`entryJSFiles[${key}] must be string[]`);
          }
          out[key] = chunks;
        }
        return out;
      }
    }
  }

  throw new Error("entryJSFiles object was not closed");
}

/** Map a public route to its app entry key using an explicit or guessed suffix. */
export function entryKeyForRoute(
  route: string,
  entryJsFiles: Record<string, string[]>,
  entrySuffix?: string,
): string | undefined {
  const suffix =
    entrySuffix ??
    (route === "/" ? "/app/page" : `/app${route.endsWith("/") ? route.slice(0, -1) : route}/page`);

  return Object.keys(entryJsFiles).find((key) => key.endsWith(suffix));
}

export function firstLoadBytes(
  buildManifest: BuildManifest,
  entryChunks: string[],
  sizeOf: (relativePath: string) => number,
): number {
  const files = new Set(
    [...buildManifest.rootMainFiles, ...buildManifest.polyfillFiles, ...entryChunks].map(
      normalizeChunkPath,
    ),
  );

  let total = 0;
  for (const file of files) total += sizeOf(file);
  return total;
}

export function findForbiddenModules(manifestSource: string, needles: string[]): string[] {
  return needles.filter((needle) => manifestSource.includes(needle));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return undefined;
    out.push(item);
  }
  return out;
}

function parseBuildManifest(raw: unknown): BuildManifest {
  if (!isRecord(raw)) throw new Error("build-manifest.json must be an object");
  const rootMainFiles = asStringArray(raw["rootMainFiles"]);
  const polyfillFiles = asStringArray(raw["polyfillFiles"]);
  if (rootMainFiles === undefined || polyfillFiles === undefined) {
    throw new Error("build-manifest.json is missing rootMainFiles/polyfillFiles string arrays");
  }
  return { rootMainFiles, polyfillFiles };
}

function parseRouteBudget(raw: unknown, route: string): RouteBudget {
  if (!isRecord(raw)) throw new Error(`budget for ${route} must be an object`);
  const maxFirstLoadJsBytes = raw["maxFirstLoadJsBytes"];
  if (typeof maxFirstLoadJsBytes !== "number" || !Number.isFinite(maxFirstLoadJsBytes)) {
    throw new Error(`budget for ${route} needs a numeric maxFirstLoadJsBytes`);
  }
  const budget: RouteBudget = { maxFirstLoadJsBytes };
  const forbiddenRaw = raw["forbiddenModuleSubstrings"];
  if (forbiddenRaw !== undefined) {
    const forbiddenModuleSubstrings = asStringArray(forbiddenRaw);
    if (forbiddenModuleSubstrings === undefined) {
      throw new Error(`budget for ${route}: forbiddenModuleSubstrings must be string[]`);
    }
    budget.forbiddenModuleSubstrings = forbiddenModuleSubstrings;
  }
  if (typeof raw["manifestPath"] === "string") {
    budget.manifestPath = raw["manifestPath"];
  }
  if (typeof raw["entrySuffix"] === "string") {
    budget.entrySuffix = raw["entrySuffix"];
  }
  return budget;
}

function parseBudgetFile(raw: unknown): BundleBudgetFile {
  if (!isRecord(raw) || !isRecord(raw["routes"])) {
    throw new Error("bundle-budget.json must have a routes object");
  }
  const routes: Record<string, RouteBudget> = {};
  for (const [route, value] of Object.entries(raw["routes"])) {
    routes[route] = parseRouteBudget(value, route);
  }
  return { routes };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clientManifestPath(nextDir: string, route: string, manifestPath?: string): string {
  if (manifestPath !== undefined) {
    return join(nextDir, manifestPath);
  }
  if (route === "/") {
    return join(nextDir, "server/app/page_client-reference-manifest.js");
  }
  const trimmed = route.startsWith("/") ? route.slice(1) : route;
  return join(nextDir, "server/app", trimmed, "page_client-reference-manifest.js");
}

/**
 * Evaluate budgets against an already-built `.next` directory.
 * Pure enough to unit-test with fixture manifests.
 */
export function checkBundleBudget(options: {
  budget: BundleBudgetFile;
  buildManifest: BuildManifest;
  /** route → client-reference-manifest source */
  routeManifests: Record<string, string>;
  sizeOf: (relativePath: string) => number;
}): BudgetReport {
  const problems: string[] = [];
  const measured: Record<string, number> = {};

  for (const [route, routeBudget] of Object.entries(options.budget.routes)) {
    const manifestSource = options.routeManifests[route];
    if (manifestSource === undefined) {
      problems.push(`${route}: missing client-reference-manifest`);
      continue;
    }

    let entryJsFiles: Record<string, string[]>;
    try {
      entryJsFiles = parseEntryJsFiles(manifestSource);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      problems.push(`${route}: ${message}`);
      continue;
    }

    const entryKey = entryKeyForRoute(route, entryJsFiles, routeBudget.entrySuffix);
    if (entryKey === undefined) {
      problems.push(`${route}: no entryJSFiles key ending in app page path`);
      continue;
    }

    const bytes = firstLoadBytes(
      options.buildManifest,
      entryJsFiles[entryKey] ?? [],
      options.sizeOf,
    );
    measured[route] = bytes;

    if (bytes > routeBudget.maxFirstLoadJsBytes) {
      problems.push(
        `${route}: First Load JS ${bytes} bytes exceeds budget ${routeBudget.maxFirstLoadJsBytes}`,
      );
    }

    const forbidden = routeBudget.forbiddenModuleSubstrings ?? [];
    if (forbidden.length > 0) {
      const hits = findForbiddenModules(manifestSource, forbidden);
      if (hits.length > 0) {
        problems.push(`${route}: forbidden module path(s) in client graph: ${hits.join(", ")}`);
      }
    }
  }

  return { problems, measured };
}

export function checkBundleBudgetFromDisk(options: {
  appDir: string;
  budgetPath?: string;
  nextDir?: string;
}): BudgetReport {
  const appDir = options.appDir;
  const nextDir = options.nextDir ?? join(appDir, ".next");
  const budgetPath = options.budgetPath ?? join(appDir, "bundle-budget.json");

  const budget = parseBudgetFile(readJson(budgetPath));
  const buildManifest = parseBuildManifest(readJson(join(nextDir, "build-manifest.json")));

  const routeManifests: Record<string, string> = {};
  for (const [route, routeBudget] of Object.entries(budget.routes)) {
    routeManifests[route] = readFileSync(
      clientManifestPath(nextDir, route, routeBudget.manifestPath),
      "utf8",
    );
  }

  return checkBundleBudget({
    budget,
    buildManifest,
    routeManifests,
    sizeOf: (relativePath) => statSync(join(nextDir, relativePath)).size,
  });
}

if (import.meta.main) {
  const appDir = resolve(import.meta.dirname, "../apps/web");
  const report = checkBundleBudgetFromDisk({ appDir });

  for (const [route, bytes] of Object.entries(report.measured)) {
    const kib = (bytes / 1024).toFixed(1);
    console.log(`  ${route}: ${bytes} bytes (${kib} KiB) First Load JS`);
  }

  if (report.problems.length > 0) {
    console.error(`\n✗ ${report.problems.length} bundle budget violation(s):\n`);
    for (const problem of report.problems) console.error(`  • ${problem}\n`);
    process.exit(1);
  }

  console.log("✓ Bundle budgets hold.");
}
