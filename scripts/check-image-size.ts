/**
 * Fail if built app images exceed Phase 11 budgets.
 *
 * Budgets are for **linux/amd64** uncompressed size from
 * `docker image inspect .Size` (what CI measures). Arm64 local images are
 * smaller and must not be used to set the bar.
 *
 * Usage: `node --experimental-strip-types scripts/check-image-size.ts`
 * Expects local tags: repo-web:local, repo-migrate:local
 */

import { execFileSync } from "node:child_process";

const MiB = 1024 * 1024;

/**
 * Headroom over slimmed linux/amd64 CI measurements (~10%).
 * Web raised after pnpm 12 + OpenSSL 3.5.8 (265 MB measured on linux/amd64).
 * Migrate carries only the bundled Drizzle CLI plus SQL on bare Alpine, so it
 * sits well under the app-class budgets; calibrate after the first amd64 CI
 * measure if needed.
 */
const budgets: ReadonlyArray<{ tag: string; maxBytes: number }> = [
  { tag: "repo-web:local", maxBytes: 275 * MiB },
  { tag: "repo-migrate:local", maxBytes: 120 * MiB },
];

function imageBytes(tag: string): number {
  const out = execFileSync("docker", ["image", "inspect", tag, "--format", "{{.Size}}"], {
    encoding: "utf8",
  }).trim();
  const size = Number(out);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`Could not read size for ${tag}: ${out}`);
  }
  return size;
}

function mb(bytes: number): string {
  return `${(bytes / MiB).toFixed(1)} MB`;
}

let failed = false;

for (const { tag, maxBytes } of budgets) {
  const size = imageBytes(tag);
  const ok = size <= maxBytes;
  const line = `${tag}: ${mb(size)} (budget ${mb(maxBytes)})`;
  if (ok) {
    console.log(`✓ ${line}`);
  } else {
    console.error(`✗ ${line}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
