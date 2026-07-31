/**
 * Fail if built app images exceed Phase 11 budgets.
 *
 * Usage: `node --experimental-strip-types scripts/check-image-size.ts`
 * Expects local tags: repo-web:local, repo-api:local, repo-worker:local
 */

import { execFileSync } from "node:child_process";

const budgets: ReadonlyArray<{ tag: string; maxBytes: number }> = [
  { tag: "repo-web:local", maxBytes: 250 * 1024 * 1024 },
  { tag: "repo-api:local", maxBytes: 150 * 1024 * 1024 },
  { tag: "repo-worker:local", maxBytes: 150 * 1024 * 1024 },
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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
