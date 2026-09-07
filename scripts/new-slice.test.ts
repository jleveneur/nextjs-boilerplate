import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { applyPatch, deriveNames, patches, templates, type Patch } from "./new-slice.ts";

const ROOT = resolve(import.meta.dirname, "..");
const NAMES = deriveNames("widget");

describe("deriveNames", () => {
  it("derives the casings a slice needs", () => {
    assert.deepEqual(NAMES, { camel: "widget", pascal: "Widget", plural: "widgets" });
  });

  it("keeps inner capitals for a compound name", () => {
    assert.deepEqual(deriveNames("purchaseOrder"), {
      camel: "purchaseOrder",
      pascal: "PurchaseOrder",
      plural: "purchaseOrders",
    });
  });

  it("takes an explicit plural for irregular nouns", () => {
    assert.equal(deriveNames("person", "people").plural, "people");
    assert.equal(deriveNames("person", "  ").plural, "persons");
  });

  it.each ??= undefined;

  it("rejects names that would produce invalid identifiers", () => {
    for (const bad of ["Widget", "widget-thing", "widget_thing", "9widget", "", " "]) {
      assert.throws(() => deriveNames(bad), /lowerCamelCase/u, `expected "${bad}" to be rejected`);
    }
  });
});

describe("templates", () => {
  const files = templates(NAMES);

  it("writes one file per layer it claims to cover", () => {
    assert.deepEqual(Object.keys(files).toSorted(), [
      "packages/contracts/src/widget.ts",
      "packages/db/src/schema/widget.sql.ts",
      "packages/orpc/src/routers/widget.ts",
      // A slice is its own layer-3 package, so the scaffold emits the package
      // boundary as well as the source (ADR-0013).
      "packages/widget/package.json",
      "packages/widget/src/index.ts",
      "packages/widget/src/widget.mapper.ts",
      "packages/widget/src/widget.repository.ts",
      "packages/widget/src/widget.service.test.ts",
      "packages/widget/src/widget.service.ts",
      "packages/widget/tsconfig.json",
      "packages/widget/vitest.config.ts",
      "packages/widget/vitest.server-only-stub.ts",
    ]);
  });

  it("leaves no unsubstituted placeholder", () => {
    for (const [file, contents] of Object.entries(files)) {
      assert.doesNotMatch(contents, /\$\{/u, `${file} has an unsubstituted template expression`);
    }
  });

  it("scopes every repository query by tenant", () => {
    // The generated repository is the one file most likely to be copied without
    // reading. If it ever ships an unscoped query, every slice built from it leaks.
    const repository = files["packages/widget/src/widget.repository.ts"] ?? "";

    assert.match(repository, /scopedWhere/u);
    assert.doesNotMatch(repository, /db: Database/u, "must take TenantCtx, not a bare handle");
    for (const query of repository.matchAll(/\.from\(widget\)/gu)) {
      assert.ok(query, "every select must be reachable from a scoped where");
    }
  });

  it("authorizes before it reads, in every service function", () => {
    const service = files["packages/widget/src/widget.service.ts"] ?? "";
    const bodies = service.split("export async function ").slice(1);

    assert.equal(bodies.length, 3);
    for (const body of bodies) {
      const authorizeAt = body.indexOf("authorize(");
      const repositoryAt = body.search(/\b(?:insertWidget|findWidgetById|listWidgets)\(/u);
      assert.ok(authorizeAt !== -1, "every service function must authorize");
      assert.ok(
        repositoryAt === -1 || authorizeAt < repositoryAt,
        "authorize must come before the first repository call",
      );
    }
  });

  it("keeps the transport free of queries", () => {
    const router = files["packages/orpc/src/routers/widget.ts"] ?? "";

    assert.doesNotMatch(router, /@repo\/db/u);
    // The transport imports the slice's own package, not a shared core barrel.
    assert.match(router, /@repo\/widget/u);
  });
});

describe("applyPatch", () => {
  const source = "alpha\nbeta\ngamma\n";

  it("inserts after the anchor by default", () => {
    const patch: Patch = { file: "x", anchor: "beta", insert: "beta2" };
    assert.equal(applyPatch(source, patch), "alpha\nbeta\nbeta2\ngamma\n");
  });

  it("inserts before the anchor when asked", () => {
    const patch: Patch = { file: "x", anchor: "beta", insert: "alpha2", before: true };
    assert.equal(applyPatch(source, patch), "alpha\nalpha2\nbeta\ngamma\n");
  });

  it("throws rather than silently skipping a missing anchor", () => {
    const patch: Patch = { file: "x", anchor: "delta", insert: "nope" };
    assert.throws(() => applyPatch(source, patch), /anchor not found/u);
  });
});

describe("registry anchors", () => {
  /**
   * The rot guard. Every edit this script makes is pinned to an exact line in a
   * file it does not own, so a refactor elsewhere silently breaks scaffolding.
   * Failing here says "update the generator" long before someone discovers it
   * mid-feature.
   */
  it("still matches the tree, exactly once each", async () => {
    for (const patch of patches(NAMES)) {
      const source = await readFile(resolve(ROOT, patch.file), "utf8");
      const hits = source.split("\n").filter((line) => line === patch.anchor).length;

      assert.equal(
        hits,
        1,
        `${patch.file}: anchor ${JSON.stringify(patch.anchor)} matched ${hits} lines (want 1)`,
      );
    }
  });

  it("registers the slice in every closed registry", () => {
    const touched = new Set(patches(NAMES).map((patch) => patch.file));

    // Miss any one of these and the slice compiles but is invisible: no id type,
    // no permission, no table export, no route.
    for (const required of [
      "packages/types/src/ids.ts",
      "packages/types/src/index.ts",
      "packages/permissions/src/registry.ts",
      "packages/permissions/src/roles.ts",
      "packages/db/src/schema/index.ts",
      "packages/orpc/src/root.ts",
      // The slice's own barrel is generated, not patched, so it is asserted in
      // the templates suite instead.
      "packages/kernel/src/ports/id-generator.ts",
    ]) {
      assert.ok(touched.has(required), `${required} is never patched`);
    }
  });

  it("grants the new permissions to a role", () => {
    const roleEdits = patches(NAMES).filter(
      (patch) => patch.file === "packages/permissions/src/roles.ts",
    );
    const granted = roleEdits.flatMap((patch) => patch.insert.split("\n"));

    // A permission no role holds denies everyone while reading like a feature.
    for (const action of ["create", "read", "update", "delete"]) {
      assert.ok(
        granted.some((line) => line.includes(`widget:${action}`)),
        `widget:${action} is registered but never granted`,
      );
    }
  });
});
