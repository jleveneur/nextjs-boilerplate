/**
 * Asserts the documented authorization matrix matches the permission registry.
 *
 * The matrix in `docs/security/authorization-matrix.md` is the artefact a
 * reviewer reads to answer "who can do what". A hand-maintained copy of a code
 * table drifts the moment someone adds a permission and forgets the doc — and it
 * had: the table was missing rows and its markdown was broken, which is exactly
 * the failure a security document cannot afford.
 *
 * `--write` regenerates the table in place. Everything between the table markers
 * is generated; prose around them is authored.
 *
 * Run: node scripts/check-authz-matrix.ts [--write]
 * Test: node --test scripts/check-authz-matrix.test.ts
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ALL_ACTIONS } from "../packages/permissions/src/registry.ts";
import { ROLE_PERMISSIONS } from "../packages/permissions/src/roles.ts";

const DOC_PATH = resolve(import.meta.dirname, "../docs/security/authorization-matrix.md");

const BEGIN = "<!-- begin:authz-matrix -->";
const END = "<!-- end:authz-matrix -->";

const ROLES = ["member", "admin", "owner"] as const;

/** Widest cell per column, so the rendered table stays aligned like the rest of the docs. */
function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

export function renderMatrix(): string {
  const actionCells = ALL_ACTIONS.map((action) => `\`${action}\``);
  const actionWidth = Math.max("Action".length, ...actionCells.map((cell) => cell.length));
  const roleWidths = ROLES.map((role) => Math.max(role.length, "yes".length));

  const lines: string[] = [
    `| ${pad("Action", actionWidth)} | ${ROLES.map((role, i) => pad(role, roleWidths[i] ?? 0)).join(" | ")} |`,
    `| ${"-".repeat(actionWidth)} | ${roleWidths.map((w) => "-".repeat(w)).join(" | ")} |`,
  ];

  for (const [index, action] of ALL_ACTIONS.entries()) {
    const cells = ROLES.map((role, i) =>
      pad(ROLE_PERMISSIONS[role].includes(action) ? "yes" : "", roleWidths[i] ?? 0),
    );
    lines.push(`| ${pad(actionCells[index] ?? "", actionWidth)} | ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}

function replaceBlock(source: string, table: string): string {
  const begin = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`authorization-matrix.md is missing the ${BEGIN} / ${END} markers`);
  }

  return `${source.slice(0, begin + BEGIN.length)}\n\n${table}\n\n${source.slice(end)}`;
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const current = await readFile(DOC_PATH, "utf8");
  const expected = replaceBlock(current, renderMatrix());

  if (current === expected) {
    console.log(`✓ Authorization matrix matches the registry (${ALL_ACTIONS.length} actions).`);
    return;
  }

  if (write) {
    await writeFile(DOC_PATH, expected, "utf8");
    console.log(`✓ Rewrote the authorization matrix (${ALL_ACTIONS.length} actions).`);
    return;
  }

  console.error(
    "✗ docs/security/authorization-matrix.md is out of date with the permission registry.\n" +
      "  Run: node scripts/check-authz-matrix.ts --write",
  );
  process.exitCode = 1;
}

if (process.argv[1] === import.meta.filename) {
  await main();
}
