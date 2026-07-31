import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Browser packages must not pull Node built-ins or node-runtime packages into
 * the client graph (docs/architecture/03-package-graph-and-boundaries.md §3.4).
 */

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const uiPackageJsonPath = path.join(packageRoot, "..", "package.json");
const require = createRequire(import.meta.url);

const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "dns",
  "fs",
  "http",
  "https",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "querystring",
  "readline",
  "stream",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

const FORBIDDEN_PACKAGE_NAMES = new Set([
  "fs-extra",
  "node-fetch",
  "postgres",
  "ioredis",
  "bullmq",
  "drizzle-orm",
  "better-auth",
  "pino",
]);

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function readPackageJson(filePath: string): PackageJson {
  return JSON.parse(readFileSync(filePath, "utf8")) as PackageJson;
}

function runtimeDeps(pkg: PackageJson): string[] {
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.optionalDependencies ?? {})];
}

function resolvePackageJson(depName: string, fromFile: string): string | null {
  try {
    return require.resolve(`${depName}/package.json`, { paths: [path.dirname(fromFile)] });
  } catch {
    try {
      const entry = require.resolve(depName, { paths: [path.dirname(fromFile)] });
      let dir = path.dirname(entry);
      for (let i = 0; i < 8; i += 1) {
        const candidate = path.join(dir, "package.json");
        try {
          const parsed = readPackageJson(candidate);
          if (parsed.name === depName) {
            return candidate;
          }
        } catch {
          // keep walking
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
          break;
        }
        dir = parent;
      }
      return null;
    } catch {
      return null;
    }
  }
}

function collectClosure(rootPackageJson: string): Set<string> {
  const seen = new Set<string>();
  const queue = [rootPackageJson];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || seen.has(current)) {
      continue;
    }
    seen.add(current);
    const pkg = readPackageJson(current);
    for (const dep of runtimeDeps(pkg)) {
      if (dep.startsWith("node:") || NODE_BUILTINS.has(dep)) {
        throw new Error(`Node builtin dependency detected: ${dep} via ${pkg.name ?? current}`);
      }
      if (FORBIDDEN_PACKAGE_NAMES.has(dep)) {
        throw new Error(`Forbidden node package in graph: ${dep} via ${pkg.name ?? current}`);
      }
      const resolved = resolvePackageJson(dep, current);
      if (resolved !== null) {
        queue.push(resolved);
      }
    }
  }

  return seen;
}

describe("browser-safety", () => {
  it("imports the package entry in jsdom", async () => {
    const mod = await import("./index.ts");
    expect(typeof mod.cn).toBe("function");
    expect(typeof mod.Button).toBe("function");
  });

  it("has no node:* or server-only packages in the runtime graph", () => {
    const closure = collectClosure(uiPackageJsonPath);
    expect(closure.size).toBeGreaterThan(1);
  });
});
