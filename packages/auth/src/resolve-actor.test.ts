import { describe, expect, it, vi } from "vitest";

import type { Auth } from "./create-auth.ts";
import { permissionsForOrganizationRole } from "./role-permissions.ts";
import { resolveActorFromApiKey } from "./resolve-actor.ts";

type VerifyApiKeyResult = Awaited<ReturnType<Auth["api"]["verifyApiKey"]>>;
type VerifiedApiKey = NonNullable<Extract<VerifyApiKeyResult, { error: null }>["key"]>;

function createVerifiedApiKey(permissions: VerifiedApiKey["permissions"]): VerifiedApiKey {
  return {
    id: "0198a84d-2d16-7def-a4f3-ef3eec3c35a2",
    configId: "default",
    name: "test key",
    start: "sk_test_",
    prefix: "sk_test_",
    referenceId: "0198a84d-2d16-7def-a4f3-ef3eec3c35a3",
    refillInterval: null,
    refillAmount: null,
    lastRefillAt: null,
    enabled: true,
    rateLimitEnabled: false,
    rateLimitTimeWindow: null,
    rateLimitMax: null,
    requestCount: 1,
    remaining: null,
    lastRequest: null,
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    metadata: { userId: "0198a84d-2d16-7def-a4f3-ef3eec3c35a4" },
    permissions,
  };
}

function createAuthMock(permissions: VerifiedApiKey["permissions"]) {
  const verifyApiKey = vi.fn(() =>
    Promise.resolve({
      valid: true,
      error: null,
      key: createVerifiedApiKey(permissions),
    }),
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- focused Better Auth endpoint mock
  const auth = { api: { verifyApiKey } } as unknown as Auth;

  return { auth, verifyApiKey };
}

describe("resolveActorFromApiKey", () => {
  it("intersects explicit key permissions with the role grants", async () => {
    const { auth, verifyApiKey } = createAuthMock({
      invoice: ["read", "void"],
      organization: ["delete"],
      asset: ["read"],
      arbitrary: ["action"],
    });

    const actor = await resolveActorFromApiKey({
      auth,
      key: "sk_test_secret",
      fallbackRole: "member",
    });

    expect(verifyApiKey).toHaveBeenCalledWith({ body: { key: "sk_test_secret" } });
    expect(actor?.permissions).toEqual(["invoice:read", "asset:read"]);
  });

  it.each([undefined, null])(
    "uses role defaults when key permissions are %s",
    async (permissions) => {
      const { auth } = createAuthMock(permissions);

      const actor = await resolveActorFromApiKey({
        auth,
        key: "sk_test_secret",
        fallbackRole: "member",
      });

      expect(actor?.permissions).toEqual(permissionsForOrganizationRole("member"));
    },
  );

  it("treats an explicit empty permission object as no grants", async () => {
    const { auth } = createAuthMock({});

    const actor = await resolveActorFromApiKey({
      auth,
      key: "sk_test_secret",
      fallbackRole: "owner",
    });

    expect(actor?.permissions).toEqual([]);
  });
});
