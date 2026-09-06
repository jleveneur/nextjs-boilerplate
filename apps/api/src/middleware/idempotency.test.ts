import { Hono, type Context } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { Cache } from "@repo/cache";
import { createMemoryCache } from "@repo/cache/testing";
import { ConflictError, ValidationError } from "@repo/errors";
import type { Actor, OrganizationId } from "@repo/types";

import type { ApiEnv } from "../api-env.ts";
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

  it("requires a key before invoking a mutating route", async () => {
    const cache = createMemoryCache("test");
    const handler = vi.fn((c: Context<ApiEnv>) => Promise.resolve(c.json({ created: true }, 201)));
    const app = createTestApp(cache, handler);

    const response = await app.request("/mutation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 1 }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Idempotency-Key header is required for mutating requests",
    });
    expect(handler).not.toHaveBeenCalled();
    await cache.close();
  });

  /**
   * The claim is what makes a concurrent duplicate 409. Keeping it after the
   * handler failed would 409 the client's own retry for the whole pending TTL,
   * so an unfinished request has to release it — errors reach `app.onError`
   * without unwinding through the middleware's happy path.
   */
  it("releases the key when the handler throws", async () => {
    const cache = createMemoryCache("test");
    const handler = vi
      .fn<MutationHandler>()
      .mockRejectedValueOnce(new Error("downstream exploded"))
      .mockImplementation((c) => Promise.resolve(c.json({ created: true }, 201)));
    const app = createTestApp(cache, handler);

    const failed = await app.request("/mutation", REQUEST_INIT);
    expect(failed.status).toBe(500);

    const retried = await app.request("/mutation", REQUEST_INIT);
    expect(retried.status).toBe(201);
    await expect(retried.json()).resolves.toEqual({ created: true });
    expect(handler).toHaveBeenCalledTimes(2);
    await cache.close();
  });

  it("releases the key when the handler answers 5xx", async () => {
    const cache = createMemoryCache("test");
    const handler = vi
      .fn<MutationHandler>()
      .mockImplementationOnce((c) => Promise.resolve(c.json({ error: "upstream" }, 502)))
      .mockImplementation((c) => Promise.resolve(c.json({ created: true }, 201)));
    const app = createTestApp(cache, handler);

    const failed = await app.request("/mutation", REQUEST_INIT);
    expect(failed.status).toBe(502);

    // A 5xx is not a settled outcome, so it must not be replayed as one.
    const retried = await app.request("/mutation", REQUEST_INIT);
    expect(retried.status).toBe(201);
    expect(retried.headers.get("x-idempotent-replay")).toBeNull();
    await cache.close();
  });

  it("still replays a settled 4xx", async () => {
    const cache = createMemoryCache("test");
    const handler = vi.fn<MutationHandler>((c) =>
      Promise.resolve(c.json({ error: "invalid" }, 422)),
    );
    const app = createTestApp(cache, handler);

    expect((await app.request("/mutation", REQUEST_INIT)).status).toBe(422);

    const replay = await app.request("/mutation", REQUEST_INIT);
    expect(replay.status).toBe(422);
    expect(replay.headers.get("x-idempotent-replay")).toBe("true");
    expect(handler).toHaveBeenCalledOnce();
    await cache.close();
  });
});
