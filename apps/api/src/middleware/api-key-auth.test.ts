import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@repo/errors";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import type { ApiEnv } from "../api-env.ts";
import type { AppContainer } from "../server/container.ts";

const resolveActorFromApiKey = vi.fn<(input: unknown) => Promise<Actor | undefined>>();

vi.mock("@repo/auth", () => ({
  resolveActorFromApiKey: (input: unknown) => resolveActorFromApiKey(input),
}));

const { apiKeyAuthMiddleware } = await import("./api-key-auth.ts");

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
const ORGANIZATION_ID = "01900000-0000-7000-8000-000000000010" as OrganizationId;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
const USER_ID = "01900000-0000-7000-8000-000000000011" as UserId;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads ids
const ACTOR = { userId: USER_ID, organizationId: ORGANIZATION_ID } as Actor;

function createTestApp(): Hono<ApiEnv> {
  const container = {
    auth: {},
    db: {},
    logger: { child: () => ({ child: () => undefined }) },
    ports: {},
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads these
  } as unknown as AppContainer;

  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("requestId", "req-1");
    await next();
  });
  app.use("*", apiKeyAuthMiddleware);
  app.onError((error, c) =>
    c.json({ message: error.message }, error instanceof UnauthorizedError ? 401 : 500),
  );
  app.get("/thing", (c) =>
    c.json({ apiKey: c.get("apiKey"), organizationId: c.get("actor").organizationId }),
  );

  return app;
}

describe("apiKeyAuthMiddleware", () => {
  beforeEach(() => {
    resolveActorFromApiKey.mockReset();
    resolveActorFromApiKey.mockResolvedValue(ACTOR);
  });

  it("resolves an actor from a bearer token", async () => {
    const res = await createTestApp().request("/thing", {
      headers: { authorization: "Bearer sk_test_abc" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      apiKey: "sk_test_abc",
      organizationId: ORGANIZATION_ID,
    });
    expect(resolveActorFromApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ key: "sk_test_abc" }),
    );
  });

  it("accepts the scheme case-insensitively and trims the token", async () => {
    const res = await createTestApp().request("/thing", {
      headers: { authorization: "bearer   sk_test_abc  " },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ apiKey: "sk_test_abc" });
  });

  it.each([
    ["a missing header", {}],
    ["a non-bearer scheme", { authorization: "Basic sk_test_abc" }],
    ["an empty bearer token", { authorization: "Bearer   " }],
  ])("rejects %s without a key lookup", async (_label, headers) => {
    const res = await createTestApp().request("/thing", { headers });

    expect(res.status).toBe(401);
    // Rejecting malformed input before the lookup is what keeps a bad-token
    // flood off the database.
    expect(resolveActorFromApiKey).not.toHaveBeenCalled();
  });

  it("rejects a well-formed token that resolves to nothing", async () => {
    resolveActorFromApiKey.mockResolvedValue(undefined);

    const res = await createTestApp().request("/thing", {
      headers: { authorization: "Bearer sk_test_revoked" },
    });

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: "Invalid API key" });
  });
});
