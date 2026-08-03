import { createMemoryCache } from "@repo/cache/testing";
import { organizationIdSchema, userIdSchema } from "@repo/contracts";
import { ConflictError, ValidationError } from "@repo/errors";
import type { Actor } from "@repo/types";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import type { ApiEnv } from "../app.ts";
import type { AppContainer } from "../server/container.ts";
import { idempotencyMiddleware } from "./idempotency.ts";

const ACTOR: Actor = {
  userId: userIdSchema.parse("01900000-0000-7000-8000-000000000001"),
  organizationId: organizationIdSchema.parse("01900000-0000-7000-8000-000000000002"),
  role: "owner",
  permissions: [],
  isSystem: false,
};

function createHarness(): {
  app: Hono<ApiEnv>;
  routeCallCount: () => number;
} {
  const cache = createMemoryCache("test");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads cache
  const container = { cache } as AppContainer;
  const app = new Hono<ApiEnv>();
  let routeCalls = 0;

  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("actor", ACTOR);
    c.set("apiKey", "test-api-key");
    await next();
  });
  app.onError((error) => {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }
    if (error instanceof ConflictError) {
      return new Response(error.message, { status: 409 });
    }
    throw error;
  });
  app.use("*", idempotencyMiddleware);
  app.post("/resource", (c) => {
    routeCalls += 1;
    return c.json({ attempt: routeCalls }, 201);
  });

  return {
    app,
    routeCallCount: () => routeCalls,
  };
}

function mutationRequest(body: string, idempotencyKey?: string): RequestInit {
  const headers = new Headers({ "content-type": "application/json" });
  if (idempotencyKey !== undefined) {
    headers.set("idempotency-key", idempotencyKey);
  }
  return {
    method: "POST",
    headers,
    body,
  };
}

describe("idempotencyMiddleware", () => {
  it("replays a successful response without invoking the route twice", async () => {
    const { app, routeCallCount } = createHarness();
    const request = mutationRequest('{"name":"same"}', "request-1");

    const first = await app.request("/resource", request);
    const replay = await app.request("/resource", request);
    const firstBody: unknown = await first.json();
    const replayBody: unknown = await replay.json();

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(firstBody).toEqual({ attempt: 1 });
    expect(replayBody).toEqual(firstBody);
    expect(replay.headers.get("x-idempotent-replay")).toBe("true");
    expect(routeCallCount()).toBe(1);
  });

  it("rejects reuse of a key with a different body", async () => {
    const { app, routeCallCount } = createHarness();

    const first = await app.request("/resource", mutationRequest('{"name":"first"}', "request-2"));
    const conflict = await app.request(
      "/resource",
      mutationRequest('{"name":"second"}', "request-2"),
    );

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(409);
    await expect(conflict.text()).resolves.toBe(
      "Idempotency-Key was reused with a different request body",
    );
    expect(routeCallCount()).toBe(1);
  });

  it("requires a key before invoking a mutating route", async () => {
    const { app, routeCallCount } = createHarness();

    const response = await app.request("/resource", mutationRequest('{"name":"missing"}'));

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe(
      "Idempotency-Key header is required for mutating requests",
    );
    expect(routeCallCount()).toBe(0);
  });
});
