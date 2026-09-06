import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { InternalError, NotFoundError, RateLimitError, ValidationError } from "@repo/errors";

import type { ApiEnv } from "../api-env.ts";
import type { AppContainer } from "../server/container.ts";
import { errorHandler } from "./error-handler.ts";

function createTestApp(thrown: unknown): {
  app: Hono<ApiEnv>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  capture: ReturnType<typeof vi.fn>;
} {
  const error = vi.fn();
  const warn = vi.fn();
  const capture = vi.fn();
  const container = {
    logger: { error, warn },
    errorTracker: { capture },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- handler reads only these
  } as unknown as AppContainer;

  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("requestId", "req-1");
    await next();
  });
  app.onError(errorHandler);
  app.get("/thing", () => {
    throw thrown;
  });

  return { app, error, warn, capture };
}

describe("errorHandler", () => {
  it("renders an expected error as problem+json", async () => {
    const { app, warn, error } = createTestApp(
      new NotFoundError({ resource: "invoice", id: "inv_1" }),
    );

    const res = await app.request("/thing");

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    const body: unknown = await res.json();
    expect(body).toMatchObject({
      status: 404,
      detail: "invoice not found: inv_1",
      request_id: "req-1",
    });
    // Expected outcomes are not incidents — alert fatigue hides the real ones.
    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("does not report an expected error to the tracker", () => {
    const { capture } = createTestApp(new NotFoundError({ resource: "invoice", id: "inv_1" }));

    expect(capture).not.toHaveBeenCalled();
  });

  it("logs an unexpected error and withholds its message", async () => {
    const { app, warn, error } = createTestApp(new Error("connection string user:pw@host"));

    const res = await app.request("/thing");

    expect(res.status).toBe(500);
    const body: unknown = await res.json();
    expect(JSON.stringify(body)).not.toContain("user:pw@host");
    expect(error).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports an unexpected error to the tracker, with the correlation keys", async () => {
    const { app, capture } = createTestApp(new Error("boom"));

    await app.request("/thing");

    // Same condition as the log line, so the two never disagree about what an
    // incident is.
    expect(capture).toHaveBeenCalledOnce();
    expect(capture.mock.calls[0]?.[1]).toMatchObject({
      requestId: "req-1",
      operation: "GET /thing",
    });
  });

  it("does not expose an internal error's message", async () => {
    const { app } = createTestApp(new InternalError({ message: "table users does not exist" }));

    const res = await app.request("/thing");

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("table users");
  });

  it("carries Retry-After from a rate limit error", async () => {
    const { app } = createTestApp(
      new RateLimitError({ message: "Rate limit exceeded", retryAfterSeconds: 42 }),
    );

    const res = await app.request("/thing");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("unwraps an AppError carried as a cause", async () => {
    const wrapped = new Error("handler failed", {
      cause: new ValidationError({ message: "amount must be positive" }),
    });
    const { app } = createTestApp(wrapped);

    const res = await app.request("/thing");

    // Re-throwing with `cause` must not downgrade a 400 into a 500.
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("amount must be positive");
  });
});
