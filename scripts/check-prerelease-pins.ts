/**
 * Reports catalog entries pinned to a prerelease, and whether the wait is over.
 *
 * The repo pins `@orpc/*` to `2.0.0-beta.33` for the private API transport.
 * [ADR-0012](../docs/adr/0012-orpc-2-private-api.md) accepts that risk and names
 * the exit condition — "when `latest` points at 2.x, drop the beta pin". That
 * sentence is prose, and prose does not fire. Nobody re-reads an accepted ADR to
 * check whether its revisit trigger has been met, so a temporary pin becomes a
 * permanent one by default.
 *
 * This turns the trigger into something that runs. It compares each prerelease
 * pin against the registry's `latest` and fails once a stable release of the
 * same major exists — at which point dropping the pin is a catalog bump, not a
 * decision.
 *
 * ## Why this is not in `make check`
 *
 * It needs the network. A quality gate that fails on a plane, in a tunnel, or in
 * a sandboxed build is a gate people learn to skip, and the answer changes on
 * the registry's schedule rather than on the diff's. It runs nightly instead,
 * where the cost of being wrong is a notification rather than a blocked commit.
 * Unreachable registry is not a failure — see {@link checkPrereleasePins}.
 *
 * Run: node scripts/check-prerelease-pins.ts
 * Test: node --test scripts/check-prerelease-pins.test.ts
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "https://registry.npmjs.org";

export type PrereleasePin = {
  /** Package name as it appears in the catalog. */
  readonly name: string;
  /** Exact pinned version, including the prerelease suffix. */
  readonly version: string;
  /** Major of the pinned version — what `latest` has to reach. */
  readonly major: number;
};

/**
 * Prerelease pins in a `pnpm-workspace.yaml` catalog block.
 *
 * Parsed with a line matcher rather than a YAML library. The catalog is a flat
 * `name: version` list under one key, this script is the only reader, and adding
 * a YAML parser to the root for six lines of matching would be a dependency the
 * repo's own bar rejects. The narrowness is the point: anything that is not a
 * plain scalar entry under `catalog:` is not a version pin.
 */
export function findPrereleasePins(workspaceYaml: string): PrereleasePin[] {
  const pins: PrereleasePin[] = [];
  let inCatalog = false;

  for (const line of workspaceYaml.split("\n")) {
    // A non-indented, non-comment line ends the block we are in.
    if (/^\S/u.test(line)) {
      inCatalog = /^catalog:\s*$/u.test(line);
      continue;
    }
    if (!inCatalog) continue;

    const match = /^\s{2}"?(?<name>[^"\s:]+)"?:\s*(?<version>\S+)\s*$/u.exec(line);
    const name = match?.groups?.["name"];
    const version = match?.groups?.["version"];
    if (name === undefined || version === undefined) continue;

    // A prerelease is the `-suffix` after the patch, per semver.
    const semver = /^(?<major>\d+)\.\d+\.\d+-/u.exec(version);
    const major = semver?.groups?.["major"];
    if (major === undefined) continue;

    pins.push({ name, version, major: Number(major) });
  }

  return pins;
}

/**
 * Whether a stable release has caught up with a pinned prerelease.
 *
 * True when `latest` is at or beyond the pinned major *and* is not itself a
 * prerelease. The major has to match or exceed rather than equal exactly: if the
 * registry has moved to 3.x while we sit on a 2.x beta, the pin is even more
 * overdue, not less.
 */
export function isSupersededByStable(pin: PrereleasePin, latest: string): boolean {
  if (latest.includes("-")) return false;

  const major = /^(?<major>\d+)\./u.exec(latest)?.groups?.["major"];
  return major !== undefined && Number(major) >= pin.major;
}

export type PinReport = {
  readonly pin: PrereleasePin;
  /** `latest` dist-tag, or undefined when the registry could not be reached. */
  readonly latest: string | undefined;
};

export type CheckResult = {
  readonly reports: readonly PinReport[];
  /** Pins whose stable release has landed. Non-empty means action is due. */
  readonly ready: readonly PinReport[];
  /** True when at least one lookup failed, so the result is incomplete. */
  readonly incomplete: boolean;
};

/**
 * Looks up the `latest` dist-tag, returning undefined rather than throwing.
 *
 * No custom `accept` header. npm's abbreviated-metadata type
 * (`application/vnd.npm.install-v1+json`) is only valid on the packument
 * endpoint; sending it here answers **406** and every lookup silently reports
 * "unknown" forever. That was the first version of this function, and the
 * lenient default hid it — which is why {@link checkPrereleasePins} carries a
 * strict mode and CI uses it.
 */
async function fetchLatest(name: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${REGISTRY}/${name}/latest`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return undefined;

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;

    const version = (body as { version?: unknown }).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    // Offline, DNS failure, rate limit, timeout. All mean "unknown", not "fine"
    // and not "broken" — the caller decides, and this script decides not to fail.
    return undefined;
  }
}

/**
 * Resolves every pin against the registry.
 *
 * A lookup that fails marks the result {@link CheckResult.incomplete} rather
 * than counting as "no stable release yet". Treating an unreachable registry as
 * a pass would be the same silent wrong answer this check exists to prevent.
 */
export async function checkPrereleasePins(pins: readonly PrereleasePin[]): Promise<CheckResult> {
  const reports = await Promise.all(
    pins.map(async (pin) => ({ pin, latest: await fetchLatest(pin.name) })),
  );

  return {
    reports,
    ready: reports.filter(
      (report) => report.latest !== undefined && isSupersededByStable(report.pin, report.latest),
    ),
    incomplete: reports.some((report) => report.latest === undefined),
  };
}

/** Reads the workspace manifest relative to this script. */
export function readWorkspaceYaml(root = resolve(dirname(fileURLToPath(import.meta.url)), "..")) {
  return readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
}

if (import.meta.main) {
  // CI passes --strict so an unresolved lookup fails rather than passing quietly.
  const strict = process.argv.includes("--strict");
  const pins = findPrereleasePins(readWorkspaceYaml());

  if (pins.length === 0) {
    console.log("✓ No prerelease pins in the catalog.");
    process.exit(0);
  }

  const { reports, ready, incomplete } = await checkPrereleasePins(pins);

  console.log(`Prerelease pins in the catalog (${String(pins.length)}):\n`);
  for (const { pin, latest } of reports) {
    console.log(`  • ${pin.name}@${pin.version} — latest: ${latest ?? "unknown"}`);
  }

  if (ready.length > 0) {
    console.error(`\n✗ ${String(ready.length)} pin(s) now have a stable release:\n`);
    for (const { pin, latest } of ready) {
      console.error(`  • ${pin.name}: pinned ${pin.version}, latest is ${String(latest)}`);
    }
    console.error(
      "\nDrop the prerelease pin in pnpm-workspace.yaml and remove the matching\n" +
        "minimumReleaseAgeExclude entry. For @orpc/*, ADR-0012 names this as a\n" +
        "catalog bump rather than a new transport decision.\n",
    );
    process.exit(1);
  }

  if (incomplete) {
    const unresolved = reports.filter((report) => report.latest === undefined).length;

    // Locally this is almost always "no network", which must not fail a
    // developer's run. In CI there is network, so an unresolved lookup means the
    // check itself is broken and reporting nothing — the one outcome that would
    // let a pin outlive its exit condition unnoticed.
    if (strict) {
      console.error(
        `\n✗ ${String(unresolved)} version(s) could not be resolved.\n\n` +
          "  Run with network access, or fix the registry lookup. In --strict mode\n" +
          "  an unresolved lookup is a failure: a check that reports 'unknown'\n" +
          "  forever is indistinguishable from one that never fires.\n",
      );
      process.exit(1);
    }

    console.log("\n! Some versions could not be resolved; the registry may be unreachable.");
    process.exit(0);
  }

  console.log("\n✓ No prerelease pin has a stable release yet.");
}
