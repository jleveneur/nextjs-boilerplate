/**
 * Auth-layer audit events. Composition roots map these into `@repo/core`
 * `recordAuditLog` — this package must not import core or db.
 */

import { createAuthMiddleware } from "better-auth/api";

export type AuthAuditEvent = {
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
};

export type OnAuditEvent = (event: AuthAuditEvent) => Promise<void>;

export async function emitAuthAudit(
  onAuditEvent: OnAuditEvent | undefined,
  event: AuthAuditEvent,
): Promise<void> {
  if (onAuditEvent === undefined) {
    return;
  }
  await onAuditEvent(event);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return Object.fromEntries(Object.entries(value));
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function metadataUserId(metadata: unknown): string | null {
  if (typeof metadata === "string") {
    try {
      return metadataUserId(JSON.parse(metadata));
    } catch {
      return null;
    }
  }
  const record = asRecord(metadata);
  if (record === undefined) {
    return null;
  }
  return readString(record, "userId") ?? null;
}

function sessionUserId(session: unknown): string | null {
  const wrapper = asRecord(session);
  if (wrapper === undefined) {
    return null;
  }
  const user = asRecord(wrapper["user"]);
  if (user === undefined) {
    return null;
  }
  return readString(user, "id") ?? null;
}

function sessionOrganizationId(session: unknown): string | undefined {
  const wrapper = asRecord(session);
  if (wrapper === undefined) {
    return undefined;
  }
  const inner = asRecord(wrapper["session"]);
  if (inner === undefined) {
    return undefined;
  }
  return readString(inner, "activeOrganizationId");
}

export type ApiKeyAuditHookInput = {
  path: string;
  returned: unknown;
  body: unknown;
  session: unknown;
};

/** Shared by the Better Auth after-hook and unit tests. */
export async function emitApiKeyAudit(
  onAuditEvent: OnAuditEvent,
  input: ApiKeyAuditHookInput,
): Promise<void> {
  if (input.returned instanceof Error) {
    return;
  }

  if (input.path === "/api-key/create") {
    const record = asRecord(input.returned);
    if (record === undefined) {
      return;
    }
    const id = readString(record, "id");
    const referenceId = readString(record, "referenceId");
    if (id === undefined || referenceId === undefined) {
      return;
    }
    const name = readString(record, "name");
    await onAuditEvent({
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: id,
      organizationId: referenceId,
      actorUserId: metadataUserId(record["metadata"]) ?? sessionUserId(input.session),
      metadata: name === undefined ? {} : { name },
    });
    return;
  }

  if (input.path === "/api-key/delete") {
    const body = asRecord(input.body);
    const keyId = body === undefined ? undefined : readString(body, "keyId");
    const organizationId = sessionOrganizationId(input.session);
    if (keyId === undefined || organizationId === undefined) {
      return;
    }
    await onAuditEvent({
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: keyId,
      organizationId,
      actorUserId: sessionUserId(input.session),
      metadata: {},
    });
  }
}

/** After-hook for Better Auth API-key create/delete (no `databaseHooks.apikey`). */
export function createApiKeyAuditMiddleware(onAuditEvent: OnAuditEvent | undefined) {
  return createAuthMiddleware(async (ctx) => {
    if (onAuditEvent === undefined) {
      return;
    }
    await emitApiKeyAudit(onAuditEvent, {
      path: ctx.path,
      returned: ctx.context.returned,
      body: ctx.body,
      session: ctx.context.session,
    });
  });
}
