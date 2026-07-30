/**
 * Asserts the layer rule from ADR-0002: a package may depend only on packages in
 * strictly lower layers.
 *
 * pnpm's isolated node_modules already makes an *undeclared* import
 * unresolvable. This script covers the remaining case: a dependency that was
 * declared deliberately but violates the layering. Together they mean a boundary
 * breach cannot happen by accident and cannot pass review silently.
 *
 * Each package declares its own layer, so there is no central registry to drift
 * out of date:
 *
 *   { "name": "@repo/core", "repo": { "layer": 2, "runtime": "node" } }
 *
 * Run: node scripts/check-layers.ts
 * Test: node --test scripts/check-layers.test.ts
 */

import { glob, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

/** Non-numeric layers sit outside the numeric stack and have their own rules. */
export const UI_LAYER = "ui";
export const TOOLING_LAYER = "tooling";

/** Apps are the top layer: they compose everything and are composed by nothing. */
const APP_LAYER = 4;

export type Layer = number | typeof UI_LAYER | typeof TOOLING_LAYER;
export type Runtime = "browser" | "node" | "build";

type Package = {
  name: string;
  path: string;
  layer: Layer;
  runtime: Runtime;
  /** Internal (@repo/*) runtime and peer dependencies. */
  deps: string[];
  /** Internal dev dependencies, which are exempt from the layer rule. */
  devDeps: string[];
};

/** Collects a violation. Passed explicitly so no module-level state accumulates. */
type Report = (message: string) => void;

export type LayerReport = {
  problems: string[];
  /** Every package discovered, including the tooling track. */
  total: number;
  /** Packages subject to the layer rule. */
  inGraph: number;
};

function isInternal(name: string): boolean {
  return name.startsWith("@repo/");
}

// `JSON.parse` returns `any`, so every field below is narrowed explicitly. A
// manifest is untrusted input to this script: a typo in "repo.layer" must
// produce a readable error, not a silently skipped check.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Dependency maps are read for their keys only, so values need no validation. */
function dependencyNames(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

function parseLayer(value: unknown): Layer | undefined {
  if (value === UI_LAYER || value === TOOLING_LAYER) return value;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  return undefined;
}

function parseRuntime(value: unknown): Runtime | undefined {
  return value === "browser" || value === "node" || value === "build" ? value : undefined;
}

async function loadPackages(root: string, fail: Report): Promise<Package[]> {
  const packages: Package[] = [];

  for await (const entry of glob("{apps,packages,tooling}/*/package.json", { cwd: root })) {
    const path = resolve(root, entry);
    const display = relative(root, path);

    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      fail(
        `${display}: not valid JSON (${error instanceof Error ? error.message : String(error)}).`,
      );
      continue;
    }

    if (!isRecord(raw)) {
      fail(`${display}: expected a JSON object.`);
      continue;
    }

    const name = raw["name"];
    if (typeof name !== "string") {
      fail(`${display}: missing or non-string "name".`);
      continue;
    }

    const repo = isRecord(raw["repo"]) ? raw["repo"] : undefined;

    if (repo?.["layer"] === undefined) {
      fail(
        `${name} (${display}): missing "repo.layer". Every package declares its own layer so ` +
          `the boundary check needs no central registry to drift out of date. ` +
          `Use an integer 0-${APP_LAYER}, "${UI_LAYER}", or "${TOOLING_LAYER}".`,
      );
      continue;
    }

    const layer = parseLayer(repo["layer"]);
    if (layer === undefined) {
      fail(
        `${name} (${display}): "repo.layer" must be an integer, "${UI_LAYER}", or ` +
          `"${TOOLING_LAYER}".`,
      );
      continue;
    }

    // An unrecognised runtime must fail rather than default, or a typo like
    // "client" would silently disable the browser-safety check.
    const runtime = repo["runtime"] === undefined ? "node" : parseRuntime(repo["runtime"]);
    if (runtime === undefined) {
      fail(`${name} (${display}): "repo.runtime" must be "browser", "node", or "build".`);
      continue;
    }

    packages.push({
      name,
      path: display,
      layer,
      runtime,
      deps: [
        ...dependencyNames(raw["dependencies"]),
        ...dependencyNames(raw["peerDependencies"]),
      ].filter(isInternal),
      devDeps: dependencyNames(raw["devDependencies"]).filter(isInternal),
    });
  }

  return packages;
}

/** Rejects duplicate package names, which would make the graph ambiguous. */
function checkUniqueNames(packages: Package[], fail: Report): void {
  const seen = new Map<string, string>();
  for (const pkg of packages) {
    const previous = seen.get(pkg.name);
    if (previous !== undefined) {
      fail(`Duplicate package name "${pkg.name}" in ${previous} and ${pkg.path}.`);
    }
    seen.set(pkg.name, pkg.path);
  }
}

function describeLayer(layer: Layer): string {
  return typeof layer === "number" ? `layer ${layer}` : `the "${layer}" track`;
}

/**
 * The layer rule. Same-layer dependencies are banned as well as upward ones:
 * that is what makes the graph acyclic by construction rather than by
 * inspection. When two layer-1 adapters appear to need each other, inject a
 * function instead of importing a package (see ADR-0002).
 */
function checkLayerRule(packages: Package[], byName: Map<string, Package>, fail: Report): void {
  for (const pkg of packages) {
    if (pkg.layer === TOOLING_LAYER) continue;

    for (const depName of pkg.deps) {
      const dep = byName.get(depName);
      if (dep === undefined) {
        fail(
          `${pkg.name} depends on "${depName}", which is not a workspace package. ` +
            `Internal packages must live in the workspace.`,
        );
        continue;
      }

      if (dep.layer === TOOLING_LAYER) {
        fail(
          `${pkg.name} (${describeLayer(pkg.layer)}) has a runtime dependency on ${dep.name}, ` +
            `which is tooling. Tooling configures the build and must never be imported by ` +
            `shipped code — move it to devDependencies.`,
        );
        continue;
      }

      // The UI track is browser-only and may depend on layer 0 alone.
      if (pkg.layer === UI_LAYER) {
        if (dep.layer !== 0) {
          fail(
            `${pkg.name} (UI track) depends on ${dep.name} (${describeLayer(dep.layer)}). ` +
              `The UI track may depend on layer 0 only, so the design system can never learn ` +
              `that a database exists.`,
          );
        }
        continue;
      }

      // Apps compose everything, but never each other.
      if (pkg.layer === APP_LAYER && dep.layer === APP_LAYER) {
        fail(
          `${pkg.name} depends on ${dep.name}. Apps are deployable units and must not depend ` +
            `on one another — extract the shared part into a package.`,
        );
        continue;
      }

      if (dep.layer === UI_LAYER) {
        if (pkg.layer !== APP_LAYER) {
          fail(
            `${pkg.name} (${describeLayer(pkg.layer)}) depends on ${dep.name} (UI track). ` +
              `Only apps may consume the UI track.`,
          );
        }
        continue;
      }

      if (typeof pkg.layer === "number" && typeof dep.layer === "number") {
        if (dep.layer === pkg.layer) {
          fail(
            `${pkg.name} depends on ${dep.name}, which is in the same layer (${pkg.layer}). ` +
              `Same-layer dependencies are banned. Move the shared piece down a layer, let a ` +
              `higher layer orchestrate both, or inject a function instead of importing a package.`,
          );
        } else if (dep.layer > pkg.layer) {
          fail(
            `${pkg.name} (layer ${pkg.layer}) depends on ${dep.name} (layer ${dep.layer}). ` +
              `Dependencies must point strictly downward.`,
          );
        }
      }
    }
  }
}

/** Browser-safe packages must not pull in server-only ones, even in dev. */
function checkRuntimeCompatibility(
  packages: Package[],
  byName: Map<string, Package>,
  fail: Report,
): void {
  for (const pkg of packages) {
    if (pkg.runtime !== "browser") continue;

    for (const depName of pkg.deps) {
      const dep = byName.get(depName);
      if (dep !== undefined && dep.runtime === "node") {
        fail(
          `${pkg.name} is browser-safe but depends on ${dep.name}, which is server-only. ` +
            `This is how secrets reach a client bundle.`,
        );
      }
    }
  }
}

/** Cycles should be impossible under the layer rule; verified rather than assumed. */
function checkNoCycles(packages: Package[], byName: Map<string, Package>, fail: Report): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(name: string, trail: string[]): void {
    if (visiting.has(name)) {
      const start = trail.indexOf(name);
      fail(`Dependency cycle: ${[...trail.slice(start), name].join(" → ")}`);
      return;
    }
    if (visited.has(name)) return;

    visiting.add(name);
    const pkg = byName.get(name);
    for (const dep of [...(pkg?.deps ?? []), ...(pkg?.devDeps ?? [])]) {
      if (byName.has(dep)) walk(dep, [...trail, name]);
    }
    visiting.delete(name);
    visited.add(name);
  }

  for (const pkg of packages) walk(pkg.name, []);
}

/**
 * Runs every boundary check against a workspace root and returns what it found.
 * Returning problems rather than exiting is what makes this testable.
 */
export async function checkLayers(root: string): Promise<LayerReport> {
  const problems: string[] = [];
  const fail: Report = (message) => {
    problems.push(message);
  };

  const packages = await loadPackages(root, fail);
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));

  checkUniqueNames(packages, fail);
  checkLayerRule(packages, byName, fail);
  checkRuntimeCompatibility(packages, byName, fail);
  checkNoCycles(packages, byName, fail);

  return {
    problems,
    total: packages.length,
    inGraph: packages.filter((pkg) => pkg.layer !== TOOLING_LAYER).length,
  };
}

if (import.meta.main) {
  const report = await checkLayers(resolve(import.meta.dirname, ".."));

  if (report.problems.length > 0) {
    console.error(`\n✗ ${report.problems.length} boundary violation(s):\n`);
    for (const problem of report.problems) console.error(`  • ${problem}\n`);
    console.error("See docs/architecture/03-package-graph-and-boundaries.md\n");
    process.exit(1);
  }

  console.log(
    `✓ Layer boundaries hold across ${report.total} package(s) (${report.inGraph} in the graph).`,
  );
}
