/**
 * Tests for the prerelease pin checker.
 *
 * The parsing and comparison halves are pure and tested here. The network half
 * is not: asserting that npm serves a particular version would make the suite
 * fail when a maintainer publishes, which is the opposite of useful.
 *
 * Run: node --test scripts/check-prerelease-pins.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findPrereleasePins,
  isSupersededByStable,
  readWorkspaceYaml,
} from "./check-prerelease-pins.ts";

const WORKSPACE = `packages:
  - apps/*

allowBuilds:
  esbuild: true
  # A comment that mentions 1.0.0-beta.1 in passing.
  lefthook: false

catalog:
  # --- Validation ---
  typescript: 7.0.2
  zod: 4.4.3
  "@orpc/server": 2.0.0-beta.33
  "@orpc/client": 2.0.0-beta.33
  react: 19.2.8
  some-rc: 3.1.0-rc.2

minimumReleaseAgeExclude:
  - "@orpc/server@2.0.0-beta.33"
  - other@1.0.0-beta.4

overrides:
  playwright-core: 1.62.0
`;

describe("findPrereleasePins", () => {
  const pins = findPrereleasePins(WORKSPACE);

  it("finds every prerelease entry in the catalog", () => {
    assert.deepEqual(
      pins.map((pin) => `${pin.name}@${pin.version}`),
      ["@orpc/server@2.0.0-beta.33", "@orpc/client@2.0.0-beta.33", "some-rc@3.1.0-rc.2"],
    );
  });

  it("reads the major off the pinned version", () => {
    assert.equal(pins[0]?.major, 2);
    assert.equal(pins[2]?.major, 3);
  });

  it("ignores stable pins", () => {
    const names = new Set(pins.map((pin) => pin.name));
    assert.ok(!names.has("typescript"));
    assert.ok(!names.has("react"));
  });

  it("ignores prerelease versions outside the catalog block", () => {
    // `minimumReleaseAgeExclude` lists the same versions as `name@version`
    // strings, and `allowBuilds` comments can mention anything. Only `catalog:`
    // declares what the workspace resolves, so only it is read.
    const names = new Set(pins.map((pin) => pin.name));
    assert.ok(!names.has("other"));
    assert.ok(!names.has('- "@orpc/server@2.0.0-beta.33"'));
    assert.equal(pins.length, 3);
  });

  it("returns nothing for a catalog with no prereleases", () => {
    assert.deepEqual(findPrereleasePins("catalog:\n  react: 19.2.8\n"), []);
    assert.deepEqual(findPrereleasePins(""), []);
  });
});

describe("isSupersededByStable", () => {
  const pin = { name: "@orpc/server", version: "2.0.0-beta.33", major: 2 };

  it("is false while latest is still on the previous major", () => {
    // The state this repo is in today: `latest` is 1.15.0, the pin is a 2.x beta.
    assert.equal(isSupersededByStable(pin, "1.15.0"), false);
  });

  it("is true once a stable release of the pinned major exists", () => {
    assert.equal(isSupersededByStable(pin, "2.0.0"), true);
    assert.equal(isSupersededByStable(pin, "2.4.1"), true);
  });

  it("is true when the registry has moved past the pinned major", () => {
    // Sitting on a 2.x beta while 3.x is stable makes the pin more overdue, not
    // less, so this must not be treated as "no stable release yet".
    assert.equal(isSupersededByStable(pin, "3.0.0"), true);
  });

  it("is false when latest is itself a prerelease", () => {
    // npm can point `latest` at a prerelease. That is not the stable release the
    // ADR's exit condition is waiting for.
    assert.equal(isSupersededByStable(pin, "2.0.0-beta.40"), false);
    assert.equal(isSupersededByStable(pin, "2.0.0-rc.1"), false);
  });

  it("is false for an unparseable version", () => {
    assert.equal(isSupersededByStable(pin, "not-a-version"), false);
    assert.equal(isSupersededByStable(pin, ""), false);
  });
});

describe("the repository's own catalog", () => {
  it("parses, and every pin it finds is a real prerelease", () => {
    // Guards the parser against a reformat of pnpm-workspace.yaml: if the shape
    // changes and this silently returns nothing, the nightly check passes
    // vacuously forever.
    const pins = findPrereleasePins(readWorkspaceYaml());

    for (const pin of pins) {
      assert.match(pin.version, /^\d+\.\d+\.\d+-/u, `${pin.name} is not a prerelease`);
      assert.ok(Number.isInteger(pin.major), `${pin.name} has no major`);
    }
  });

  it("still sees the oRPC beta pins ADR-0012 accepted", () => {
    // If this ever fails because the pins are gone, that is the good outcome —
    // delete this assertion along with the ADR's revisit trigger.
    const names = new Set(findPrereleasePins(readWorkspaceYaml()).map((pin) => pin.name));

    assert.ok(
      names.has("@orpc/server"),
      "expected @orpc/server to still be pinned to a prerelease",
    );
  });
});
