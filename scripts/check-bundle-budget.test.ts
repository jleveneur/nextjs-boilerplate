import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkBundleBudget,
  entryKeyForRoute,
  findForbiddenModules,
  firstLoadBytes,
  normalizeChunkPath,
  parseEntryJsFiles,
} from "./check-bundle-budget.ts";

describe("normalizeChunkPath", () => {
  it("strips the /_next/ prefix", () => {
    assert.equal(normalizeChunkPath("/_next/static/chunks/a.js"), "static/chunks/a.js");
    assert.equal(normalizeChunkPath("static/chunks/a.js"), "static/chunks/a.js");
  });
});

describe("parseEntryJsFiles", () => {
  it("extracts the entryJSFiles object from a manifest source", () => {
    const source = `
globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};
globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{},"entryJSFiles":{"[project]/apps/web/src/app/page":["static/chunks/a.js","static/chunks/b.js"],"[project]/apps/web/src/app/layout":["static/chunks/a.js"]}};
`;
    const parsed = parseEntryJsFiles(source);
    assert.deepEqual(parsed["[project]/apps/web/src/app/page"], [
      "static/chunks/a.js",
      "static/chunks/b.js",
    ]);
  });
});

describe("entryKeyForRoute", () => {
  it("resolves / and nested app routes", () => {
    const entries = {
      "[project]/apps/web/src/app/page": ["a.js"],
      "[project]/apps/web/src/app/design-system/page": ["b.js"],
    };
    assert.equal(entryKeyForRoute("/", entries), "[project]/apps/web/src/app/page");
    assert.equal(
      entryKeyForRoute("/design-system", entries),
      "[project]/apps/web/src/app/design-system/page",
    );
  });
});

describe("firstLoadBytes", () => {
  it("sums unique root, polyfill, and entry chunks", () => {
    const bytes = firstLoadBytes(
      {
        rootMainFiles: ["static/chunks/root.js", "static/chunks/shared.js"],
        polyfillFiles: ["static/chunks/polyfill.js"],
      },
      ["/_next/static/chunks/shared.js", "static/chunks/page.js"],
      (path) => {
        const sizes: Record<string, number> = {
          "static/chunks/root.js": 100,
          "static/chunks/shared.js": 200,
          "static/chunks/polyfill.js": 50,
          "static/chunks/page.js": 25,
        };
        return sizes[path] ?? 0;
      },
    );
    assert.equal(bytes, 375);
  });
});

describe("findForbiddenModules", () => {
  it("returns only needles that appear in the manifest", () => {
    assert.deepEqual(
      findForbiddenModules("...packages/ui/src/button...recharts...", [
        "packages/ui/",
        "recharts",
        "@tiptap/",
      ]),
      ["packages/ui/", "recharts"],
    );
  });
});

describe("checkBundleBudget", () => {
  it("reports size and forbidden-module failures", () => {
    const report = checkBundleBudget({
      budget: {
        routes: {
          "/": {
            maxFirstLoadJsBytes: 100,
            forbiddenModuleSubstrings: ["packages/ui/"],
          },
        },
      },
      buildManifest: {
        rootMainFiles: ["static/chunks/root.js"],
        polyfillFiles: [],
      },
      routeManifests: {
        "/": `{"entryJSFiles":{"[project]/apps/web/src/app/page":["static/chunks/page.js"]},"clientModules":{"[project]/packages/ui/src/button.tsx":{}}}`,
      },
      sizeOf: () => 80,
    });

    assert.equal(report.measured["/"], 160);
    assert.equal(report.problems.length, 2);
    assert.match(report.problems[0] ?? "", /exceeds budget/);
    assert.match(report.problems[1] ?? "", /forbidden module/);
  });

  it("passes when within budget and clean", () => {
    const report = checkBundleBudget({
      budget: {
        routes: {
          "/": { maxFirstLoadJsBytes: 500, forbiddenModuleSubstrings: ["recharts"] },
        },
      },
      buildManifest: {
        rootMainFiles: ["static/chunks/root.js"],
        polyfillFiles: [],
      },
      routeManifests: {
        "/": `{"entryJSFiles":{"[project]/apps/web/src/app/page":["static/chunks/page.js"]}}`,
      },
      sizeOf: () => 100,
    });

    assert.deepEqual(report.problems, []);
    assert.equal(report.measured["/"], 200);
  });
});
