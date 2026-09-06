import { describe, expect, it, vi } from "vitest";

vi.mock("better-auth/api", () => ({
  createAuthMiddleware: (handler: (ctx: unknown) => Promise<void>) => handler,
}));

import { createApiKeyAuditMiddleware, emitApiKeyAudit, emitAuthAudit } from "./audit-event.ts";

const organizationId = "01900000-0000-7000-8000-000000000001";
const userId = "01900000-0000-7000-8000-0000000000aa";
const keyId = "01900000-0000-7000-8000-0000000000bb";

type HookCtx = {
  path: string;
  body: unknown;
  context: { returned: unknown; session: unknown };
};

function callMiddleware(
  middleware: ReturnType<typeof createApiKeyAuditMiddleware>,
  ctx: HookCtx,
): Promise<void> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double of createAuthMiddleware
  return (middleware as (input: HookCtx) => Promise<void>)(ctx);
}

describe("emitAuthAudit", () => {
  it("no-ops when no listener is configured", async () => {
    await expect(
      emitAuthAudit(undefined, {
        action: "user.created",
        resourceType: "user",
        resourceId: userId,
        organizationId,
        actorUserId: userId,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("forwards the event to the listener", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    const event = {
      action: "organization.created",
      resourceType: "organization",
      resourceId: organizationId,
      organizationId,
      actorUserId: userId,
      metadata: { slug: "acme" },
    };

    await emitAuthAudit(onAuditEvent, event);

    expect(onAuditEvent).toHaveBeenCalledWith(event);
  });
});

describe("emitApiKeyAudit", () => {
  it("skips failed Better Auth responses", async () => {
    const onAuditEvent = vi.fn();
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: new Error("nope"),
      body: {},
      session: null,
    });
    expect(onAuditEvent).not.toHaveBeenCalled();
  });

  it("records api_key.created from the returned key", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: {
        id: keyId,
        referenceId: organizationId,
        name: "ci",
        metadata: { userId },
      },
      body: {},
      session: null,
    });
    expect(onAuditEvent).toHaveBeenCalledWith({
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: keyId,
      organizationId,
      actorUserId: userId,
      metadata: { name: "ci" },
    });
  });

  it("parses JSON metadata strings and falls back to the session user", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: {
        id: keyId,
        referenceId: organizationId,
        metadata: JSON.stringify({ userId }),
      },
      body: {},
      session: null,
    });
    expect(onAuditEvent.mock.calls[0]?.[0]).toMatchObject({ actorUserId: userId, metadata: {} });

    onAuditEvent.mockClear();
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: { id: keyId, referenceId: organizationId, metadata: "{not-json" },
      body: {},
      session: { user: { id: userId } },
    });
    expect(onAuditEvent.mock.calls[0]?.[0]).toMatchObject({ actorUserId: userId });
  });

  it("ignores create payloads that are not complete records", async () => {
    const onAuditEvent = vi.fn();
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: [keyId],
      body: {},
      session: null,
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: null,
      body: {},
      session: null,
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: { id: keyId },
      body: {},
      session: null,
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/other",
      returned: { id: keyId, referenceId: organizationId },
      body: {},
      session: null,
    });
    expect(onAuditEvent).not.toHaveBeenCalled();
  });

  it("records a null actor when metadata and session have no user id", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/create",
      returned: {
        id: keyId,
        referenceId: organizationId,
        metadata: 1,
      },
      body: {},
      session: { user: [] },
    });
    expect(onAuditEvent.mock.calls[0]?.[0]).toMatchObject({ actorUserId: null });
  });

  it("records api_key.revoked from the session organization", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: { keyId },
      session: {
        user: { id: userId },
        session: { activeOrganizationId: organizationId },
      },
    });
    expect(onAuditEvent).toHaveBeenCalledWith({
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: keyId,
      organizationId,
      actorUserId: userId,
      metadata: {},
    });
  });

  it("skips revoke when the key or organization is missing", async () => {
    const onAuditEvent = vi.fn();
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: null,
      session: { session: { activeOrganizationId: organizationId } },
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: { keyId: "" },
      session: { session: { activeOrganizationId: organizationId } },
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: { keyId },
      session: null,
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: { keyId },
      session: { session: [] },
    });
    await emitApiKeyAudit(onAuditEvent, {
      path: "/api-key/delete",
      returned: {},
      body: { keyId },
      session: { user: { id: userId } },
    });
    expect(onAuditEvent).not.toHaveBeenCalled();
  });
});

describe("createApiKeyAuditMiddleware", () => {
  it("no-ops when no listener is configured", async () => {
    const middleware = createApiKeyAuditMiddleware(undefined);
    await expect(
      callMiddleware(middleware, {
        path: "/api-key/create",
        body: {},
        context: {
          returned: { id: keyId, referenceId: organizationId },
          session: null,
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("forwards hook context to emitApiKeyAudit", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    const middleware = createApiKeyAuditMiddleware(onAuditEvent);
    await callMiddleware(middleware, {
      path: "/api-key/create",
      body: {},
      context: {
        returned: { id: keyId, referenceId: organizationId, name: "ci" },
        session: { user: { id: userId } },
      },
    });
    expect(onAuditEvent).toHaveBeenCalledWith({
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: keyId,
      organizationId,
      actorUserId: userId,
      metadata: { name: "ci" },
    });
  });
});
