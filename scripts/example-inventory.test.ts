import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  brokenImporters,
  FEATURES,
  proseReferences,
  sharedReferences,
  stalePaths,
  type Feature,
} from "./example-inventory.ts";

describe("feature manifest", () => {
  it("declares paths that still exist", () => {
    // The manifest is hand-written, so this is the guard against it rotting
    // silently after a refactor moves one of the example's directories.
    for (const [name, feature] of Object.entries(FEATURES)) {
      assert.deepEqual(stalePaths(feature), [], `${name} lists paths that are gone`);
    }
  });

  it("gives every feature a summary and at least one owned path", () => {
    for (const [name, feature] of Object.entries(FEATURES)) {
      assert.ok(feature.summary.length > 0, `${name} has no summary`);
      assert.ok(feature.owns.length > 0, `${name} owns nothing`);
    }
  });

  it("never lists the same path under two features", () => {
    const seen = new Map<string, string>();

    for (const [name, feature] of Object.entries(FEATURES)) {
      for (const path of feature.owns) {
        const owner = seen.get(path);
        assert.equal(owner, undefined, `${path} is owned by both ${String(owner)} and ${name}`);
        seen.set(path, name);
      }
    }
  });
});

describe("reference analysis", () => {
  const billing = FEATURES["billing"] as Feature;

  it("never reports a file the feature owns", () => {
    for (const file of [...brokenImporters(billing), ...sharedReferences(billing)]) {
      assert.ok(
        !billing.owns.some((path) => file === path || file.startsWith(`${path}/`)),
        `${file} is owned by billing and should not need editing`,
      );
    }
  });

  it("finds the composition roots that import the removed package", () => {
    const broken = brokenImporters(billing);

    // These wire @repo/payments into a container; nothing can compile without it.
    assert.ok(broken.includes("apps/web/src/server/ports.ts"));
    assert.ok(broken.includes("packages/core/src/index.ts"));
  });

  it("separates real breakage from a passing mention", () => {
    const broken = new Set(brokenImporters(billing));
    const shared = sharedReferences(billing);

    // A file that merely names a route or fixture is cleanup, not a build error;
    // conflating the two is what makes the job look bigger than it is.
    assert.ok(shared.length > 0);
    assert.ok(shared.some((file) => !broken.has(file)));
  });

  it("keeps history out of the prose list", () => {
    for (const file of proseReferences(billing)) {
      assert.doesNotMatch(file, /CHANGELOG\.md$|^packages\/db\/migrations\/|^\.changeset\//u);
    }
  });
});
