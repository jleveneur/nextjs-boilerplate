/**
 * Tests for the ADR-0002 boundary checker.
 *
 * This script is the only automated enforcement of the layer rule, so a silent
 * regression in it would quietly un-enforce the repo's central architectural
 * constraint. Each case builds a throwaway workspace in a temp directory and
 * asserts on real files, because manifest parsing is half of what can break.
 *
 * Uses node:test rather than Vitest: it runs before any workspace exists, and a
 * bootstrap check should not depend on the thing it is validating.
 *
 * Run: node --test scripts/check-layers.test.ts
 */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { checkLayers } from "./check-layers.ts";

type Manifest = Record<string, unknown>;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "layer-check-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Writes `<dir>/<name>/package.json`, verbatim, so invalid input is testable. */
async function writePackage(
  dir: "packages" | "apps" | "tooling",
  name: string,
  manifest: Manifest | string,
): Promise<void> {
  const path = join(root, dir, name);
  await mkdir(path, { recursive: true });
  const body = typeof manifest === "string" ? manifest : JSON.stringify(manifest, undefined, 2);
  await writeFile(join(path, "package.json"), body);
}

function pkg(name: string, layer: unknown, runtime?: unknown, deps?: Record<string, string>) {
  return {
    name: `@repo/${name}`,
    ...(deps === undefined ? {} : { dependencies: deps }),
    repo: { layer, ...(runtime === undefined ? {} : { runtime }) },
  };
}

/** Asserts exactly one problem, matching `pattern`. */
function assertSingleProblem(problems: string[], pattern: RegExp): void {
  assert.equal(
    problems.length,
    1,
    `expected 1 problem, got ${problems.length}: ${problems.join(" | ")}`,
  );
  assert.match(problems[0] ?? "", pattern);
}

describe("layer rule", () => {
  it("accepts a dependency pointing strictly downward", async () => {
    await writePackage("packages", "low", pkg("low", 0));
    await writePackage("packages", "high", pkg("high", 1, "node", { "@repo/low": "workspace:*" }));

    const report = await checkLayers(root);

    assert.deepEqual(report.problems, []);
    assert.equal(report.total, 2);
    assert.equal(report.inGraph, 2);
  });

  it("rejects a dependency pointing upward", async () => {
    await writePackage("packages", "low", pkg("low", 0, "node", { "@repo/high": "workspace:*" }));
    await writePackage("packages", "high", pkg("high", 1));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /must point strictly downward/);
  });

  it("rejects a dependency within the same layer outside layer 0", async () => {
    await writePackage("packages", "a", pkg("a", 2, "node", { "@repo/b": "workspace:*" }));
    await writePackage("packages", "b", pkg("b", 2));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /same layer \(2\)/);
  });

  it("allows same-layer dependencies inside layer 0", async () => {
    // Foundation packages form a small DAG (`errors → types`, `contracts → utils`).
    // The cycle checker is what keeps that DAG honest; the same-layer ban applies
    // from layer 1 up, where adapters must not couple.
    await writePackage(
      "packages",
      "errors",
      pkg("errors", 0, "browser", { "@repo/types": "workspace:*" }),
    );
    await writePackage("packages", "types", pkg("types", 0, "browser"));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });

  it("exempts devDependencies, which never reach a production bundle", async () => {
    await writePackage("packages", "low", {
      name: "@repo/low",
      devDependencies: { "@repo/high": "workspace:*" },
      repo: { layer: 0 },
    });
    await writePackage("packages", "high", pkg("high", 1));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });

  it("treats peerDependencies as runtime dependencies", async () => {
    await writePackage("packages", "low", {
      name: "@repo/low",
      peerDependencies: { "@repo/high": "workspace:*" },
      repo: { layer: 0 },
    });
    await writePackage("packages", "high", pkg("high", 1));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /must point strictly downward/);
  });

  it("rejects an internal dependency that is not in the workspace", async () => {
    await writePackage("packages", "a", pkg("a", 1, "node", { "@repo/ghost": "workspace:*" }));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /not a workspace package/);
  });

  it("ignores third-party dependencies entirely", async () => {
    await writePackage("packages", "a", pkg("a", 1, "node", { zod: "^4.0.0", react: "^19.0.0" }));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });
});

describe("app and UI tracks", () => {
  it("rejects one app depending on another", async () => {
    await writePackage("apps", "web", pkg("web", 4, "node", { "@repo/api": "workspace:*" }));
    await writePackage("apps", "api", pkg("api", 4));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /Apps are deployable units/);
  });

  it("lets an app consume the UI track", async () => {
    await writePackage("apps", "web", pkg("web", 4, "node", { "@repo/ui": "workspace:*" }));
    await writePackage("packages", "ui", pkg("ui", "ui", "browser"));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });

  it("stops a non-app from consuming the UI track", async () => {
    await writePackage("packages", "core", pkg("core", 2, "node", { "@repo/ui": "workspace:*" }));
    await writePackage("packages", "ui", pkg("ui", "ui", "browser"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /Only apps may consume the UI track/);
  });

  it("keeps the UI track away from anything above layer 0", async () => {
    await writePackage("packages", "ui", pkg("ui", "ui", "browser", { "@repo/db": "workspace:*" }));
    await writePackage("packages", "db", pkg("db", 1, "browser"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /may depend on layer 0 only/);
  });
});

describe("tooling track", () => {
  it("is excluded from the layer count", async () => {
    await writePackage("tooling", "tsconfig", pkg("tsconfig", "tooling", "build"));

    const report = await checkLayers(root);

    assert.deepEqual(report.problems, []);
    assert.equal(report.total, 1);
    assert.equal(report.inGraph, 0);
  });

  it("rejects shipped code taking a runtime dependency on tooling", async () => {
    await writePackage("packages", "a", pkg("a", 1, "node", { "@repo/tsconfig": "workspace:*" }));
    await writePackage("tooling", "tsconfig", pkg("tsconfig", "tooling", "build"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /must never be imported by shipped code/);
  });

  it("allows tooling as a devDependency", async () => {
    await writePackage("packages", "a", {
      name: "@repo/a",
      devDependencies: { "@repo/tsconfig": "workspace:*" },
      repo: { layer: 1 },
    });
    await writePackage("tooling", "tsconfig", pkg("tsconfig", "tooling", "build"));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });
});

describe("runtime safety", () => {
  it("stops a browser package from importing a server-only one", async () => {
    await writePackage("packages", "ui", pkg("ui", 1, "browser", { "@repo/env": "workspace:*" }));
    await writePackage("packages", "env", pkg("env", 0, "node"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /secrets reach a client bundle/);
  });

  it("allows a browser package to import another browser package", async () => {
    await writePackage("packages", "ui", pkg("ui", 1, "browser", { "@repo/utils": "workspace:*" }));
    await writePackage("packages", "utils", pkg("utils", 0, "browser"));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });
});

describe("manifest validation", () => {
  it("reports a missing repo.layer", async () => {
    await writePackage("packages", "a", { name: "@repo/a" });

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /missing "repo\.layer"/);
  });

  it("reports a non-integer layer", async () => {
    await writePackage("packages", "a", pkg("a", "core"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /"repo\.layer" must be an integer/);
  });

  it("reports a fractional layer", async () => {
    await writePackage("packages", "a", pkg("a", 1.5));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /"repo\.layer" must be an integer/);
  });

  it("reports an unrecognised runtime rather than defaulting", async () => {
    await writePackage("packages", "a", pkg("a", 0, "client"));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /"repo\.runtime" must be/);
  });

  it("defaults a missing runtime to node", async () => {
    await writePackage("packages", "ui", pkg("ui", 1, "browser", { "@repo/a": "workspace:*" }));
    await writePackage("packages", "a", pkg("a", 0));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /server-only/);
  });

  it("reports a missing name", async () => {
    await writePackage("packages", "a", { repo: { layer: 1 } });

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /missing or non-string "name"/);
  });

  it("reports malformed JSON without throwing", async () => {
    await writePackage("packages", "a", '{ "name": "@repo/a", }');

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /not valid JSON/);
  });

  it("reports a manifest that is not an object", async () => {
    await writePackage("packages", "a", "[]");

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /expected a JSON object/);
  });

  it("reports duplicate package names", async () => {
    await writePackage("packages", "one", pkg("same", 1));
    await writePackage("packages", "two", pkg("same", 1));

    const { problems } = await checkLayers(root);

    assertSingleProblem(problems, /Duplicate package name/);
  });
});

describe("cycles", () => {
  it("detects a cycle formed through devDependencies", async () => {
    // The layer rule cannot catch this: devDependencies are exempt from it, so
    // the cycle check is the only thing standing between here and a build that
    // cannot be ordered.
    await writePackage("packages", "a", {
      name: "@repo/a",
      devDependencies: { "@repo/b": "workspace:*" },
      repo: { layer: 1 },
    });
    await writePackage("packages", "b", {
      name: "@repo/b",
      devDependencies: { "@repo/a": "workspace:*" },
      repo: { layer: 1 },
    });

    const { problems } = await checkLayers(root);

    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? "", /Dependency cycle/);
  });

  it("does not flag a diamond, where two packages share one dependency", async () => {
    await writePackage("apps", "web", {
      name: "@repo/web",
      dependencies: { "@repo/a": "workspace:*", "@repo/b": "workspace:*" },
      repo: { layer: 4 },
    });
    await writePackage("packages", "a", pkg("a", 2, "node", { "@repo/base": "workspace:*" }));
    await writePackage("packages", "b", pkg("b", 2, "node", { "@repo/base": "workspace:*" }));
    await writePackage("packages", "base", pkg("base", 0));

    const { problems } = await checkLayers(root);

    assert.deepEqual(problems, []);
  });
});

describe("empty workspace", () => {
  it("passes when there is nothing to check", async () => {
    const report = await checkLayers(root);

    assert.deepEqual(report.problems, []);
    assert.equal(report.total, 0);
  });
});
