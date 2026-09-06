import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { ALL_ACTIONS } from "../packages/permissions/src/registry.ts";
import { ROLE_PERMISSIONS } from "../packages/permissions/src/roles.ts";
import { renderMatrix } from "./check-authz-matrix.ts";

const DOC_PATH = resolve(import.meta.dirname, "../docs/security/authorization-matrix.md");

describe("authorization matrix", () => {
  it("renders one row per registered action", () => {
    const rows = renderMatrix()
      .split("\n")
      .slice(2)
      .filter((line) => line.startsWith("|"));

    assert.equal(rows.length, ALL_ACTIONS.length);
  });

  it("marks a grant the owner holds and leaves a cell blank when the role lacks it", () => {
    const table = renderMatrix();
    const ownerOnly = table.split("\n").find((line) => line.includes("`organization:delete`"));

    assert.ok(ownerOnly, "expected an organization:delete row");
    // member and admin blank, owner yes — the row proves both cell states render.
    assert.equal(ownerOnly.match(/yes/gu)?.length, 1);
  });

  it("orders columns member, admin, owner", () => {
    const header = renderMatrix().split("\n")[0] ?? "";
    assert.match(header, /\| member +\| admin +\| owner +\|/u);
  });

  it("every action in the table is one the registry declares", () => {
    for (const line of renderMatrix().split("\n").slice(2)) {
      const action = /`(?<action>[^`]+)`/u.exec(line)?.groups?.["action"];
      assert.ok(action, `no action cell in: ${line}`);
      assert.ok(
        (ALL_ACTIONS as readonly string[]).includes(action),
        `${action} is not in the registry`,
      );
    }
  });

  it("the committed doc is current", async () => {
    // The same assertion `make check` makes, so a stale doc fails here too rather
    // than only in the gate.
    const doc = await readFile(DOC_PATH, "utf8");
    assert.ok(
      doc.includes(renderMatrix()),
      "authorization-matrix.md is stale — run `make authz-matrix`",
    );
  });

  it("the doc agrees with the grants, not just the action list", async () => {
    const doc = await readFile(DOC_PATH, "utf8");

    for (const action of ALL_ACTIONS) {
      const row = doc.split("\n").find((line) => line.includes(`\`${action}\``));
      assert.ok(row, `no documented row for ${action}`);

      const cells = row
        .split("|")
        .slice(2, 5)
        .map((cell) => cell.trim());
      const documented = { member: cells[0], admin: cells[1], owner: cells[2] };

      for (const role of ["member", "admin", "owner"] as const) {
        const granted = ROLE_PERMISSIONS[role].includes(action);
        assert.equal(
          documented[role] === "yes",
          granted,
          `${role} × ${action}: doc says "${documented[role]}", registry says ${granted}`,
        );
      }
    }
  });
});
