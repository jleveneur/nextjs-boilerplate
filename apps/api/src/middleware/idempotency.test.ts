import type { Cache } from "@repo/cache";
import { createMemoryCache } from "@repo/cache/testing";
import { ConflictError, ValidationError } from "@repo/errors";
import type { Actor, OrganizationId } from "@repo/types";
import { Hono, type Context } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { ApiEnv } from "../app.ts";
import type { AppContainer } from "../server/container.ts";
import { idempotencyMiddleware } from "./idempotency.ts";

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
const ORGANIZATION_ID = "01900000-0000-7000-8000-000000000010" as OrganizationId;
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads organizationId
const ACTOR = { organizationId: ORGANIZATION_ID } as Actor;

type MutationHandler = (c: Context<ApiEnv>) => Promise<Response>;

const noop = (): void => undefined;

function createTestApp(cache: Cache, handler: MutationHandler): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads cache
  const container = { cache } as AppContainer;

  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("actor", ACTOR);
    c.set("apiKey", "test-api-key");
    await next();
  });
  app.use("*", idempotencyMiddleware);
  app.onError((error, c) => {
    if (error instanceof ConflictError) {
      return c.json({ message: error.message }, 409);
    }
    if (error instanceof ValidationError) {
      return c.json({ message: error.message }, 400);
    }
    return c.json({ message: "Unexpected error" }, 500);
  });
  app.post("/mutation", handler);

  return app;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = noop;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const REQUEST_INIT = {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": "request-1",
  },
  body: JSON.stringify({ value: 1 }),
} satisfies RequestInit;

describe("idempotencyMiddleware", () => {
  it("rejects a concurrent duplicate and replays the completed response", async () => {
    const cache = createMemoryCache("test");
    const entered = deferred();
    const release = deferred();
    const handler = vi.fn(async (c: Context<ApiEnv>) => {
      entered.resolve();
      await release.promise;
      return c.json({ created: true }, 201);
    });
    const app = createTestApp(cache, handler);

    const firstResponsePromise = app.request("/mutation", REQUEST_INIT);
    await entered.promise;

    const concurrentResponse = await app.request("/mutation", REQUEST_INIT);
    expect(concurrentResponse.status).toBe(409);
    await expect(concurrentResponse.json()).resolves.toEqual({
      message: "A request with this Idempotency-Key is already being processed; retry later",
    });

    release.resolve();
    const firstResponse = await firstResponsePromise;
    expect(firstResponse.status).toBe(201);

    const replayResponse = await app.request("/mutation", REQUEST_INIT);
    expect(replayResponse.status).toBe(201);
    expect(replayResponse.headers.get("x-idempotent-replay")).toBe("true");
    await expect(replayResponse.json()).resolves.toEqual({ created: true });
    expect(handler).toHaveBeenCalledOnce();
    await cache.close();
  });

  it("rejects reuse of a completed key with a different body", async () => {
    const cache = createMemoryCache("test");
    const handler = vi.fn((c: Context<ApiEnv>) => Promise.resolve(c.json({ created: true }, 201)));
    const app = createTestApp(cache, handler);

    const firstResponse = await app.request("/mutation", REQUEST_INIT);
    expect(firstResponse.status).toBe(201);

    const conflictResponse = await app.request("/mutation", {
      ...REQUEST_INIT,
      body: JSON.stringify({ value: 2 }),
    });
    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toEqual({
      message: "Idempotency-Key was reused with a different request body",
    });
    expect(handler).toHaveBeenCalledOnce();
    await cache.close();
  });
});
