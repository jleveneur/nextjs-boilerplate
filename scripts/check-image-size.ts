/**
 * Fail if built app images exceed Phase 11 budgets.
 *
 * Budgets are for **linux/amd64** uncompressed size from
 * `docker image inspect .Size` (what CI measures). Arm64 local images are
 * smaller and must not be used to set the bar.
 *
 * Usage: `node --experimental-strip-types scripts/check-image-size.ts`
 * Expects local tags: repo-web:local, repo-api:local, repo-worker:local,
 * repo-docs:local
 */

import { execFileSync } from "node:child_process";

const MiB = 1024 * 1024;

/**
 * Headroom over slimmed linux/amd64 CI measurements (~10%).
 * API raised after Phase 14 OTel/Sentry (maps stay out of the image; JS still grew).
 * Docs shares the web-class budget (Next standalone + Alpine); calibrate after
 * the first amd64 CI measure if needed.
 */
const budgets: ReadonlyArray<{ tag: string; maxBytes: number }> = [
  { tag: "repo-web:local", maxBytes: 260 * MiB },
  { tag: "repo-api:local", maxBytes: 165 * MiB },
  { tag: "repo-worker:local", maxBytes: 190 * MiB },
  { tag: "repo-docs:local", maxBytes: 260 * MiB },
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
