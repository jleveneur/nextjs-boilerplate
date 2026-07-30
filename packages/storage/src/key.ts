/**
 * Structured object keys.
 *
 * Format: `<env>/<organizationId>/<entity>/<id>/<slugified-name>`
 *
 * User-supplied paths are never accepted — that is a traversal and collision hazard.
 */

import { slugify } from "@repo/utils";

import type { BuildObjectKeyInput } from "./types.ts";

const SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function buildObjectKey(input: BuildObjectKeyInput): string {
  assertSegment("appEnv", input.appEnv);
  assertSegment("organizationId", input.organizationId);
  assertSegment("entity", input.entity);
  assertSegment("id", input.id);

  const name = slugify(input.filename);
  if (name.length === 0) {
    throw new Error("filename must slugify to a non-empty segment");
  }

  return [input.appEnv, input.organizationId, input.entity, input.id, name].join("/");
}

function assertSegment(name: string, value: string): void {
  if (value.length === 0 || value.includes("/") || value.includes("..")) {
    throw new Error(`storage ${name} must be a non-empty path segment`);
  }

  if (!SEGMENT.test(value) && name !== "organizationId" && name !== "id") {
    throw new Error(`storage ${name} contains invalid characters`);
  }
}
