/**
 * Namespaced cache keys.
 *
 * Format: `<env>:<namespace>:v<version>[:org:<organizationId>]:<key>`
 *
 * The API never accepts a raw Redis key — every write goes through this builder
 * so a forgotten tenant or namespace is a type/call-site error, not a silent leak.
 */

import type { CacheKeyInput } from "./types.ts";

export function buildCacheKey(appEnv: string, input: CacheKeyInput): string {
  assertSegment("appEnv", appEnv);
  assertSegment("namespace", input.namespace);
  assertSegment("key", input.key);

  if (!Number.isInteger(input.version) || input.version < 0) {
    throw new Error("cache version must be a non-negative integer");
  }

  const parts = [appEnv, input.namespace, `v${String(input.version)}`];

  if (input.organizationId !== undefined) {
    assertSegment("organizationId", input.organizationId);
    parts.push("org", input.organizationId);
  }

  parts.push(input.key);
  return parts.join(":");
}

function assertSegment(name: string, value: string): void {
  if (value.length === 0) {
    throw new Error(`cache ${name} must be a non-empty segment`);
  }

  if (value.includes(":")) {
    throw new Error(`cache ${name} must not contain ':'`);
  }
}
