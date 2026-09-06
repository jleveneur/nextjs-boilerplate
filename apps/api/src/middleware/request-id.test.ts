import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import type { ApiEnv } from "../api-env.ts";
import type { AppContainer } from "../server/container.ts";
import { requestIdMiddleware } from "./request-id.ts";

function createTestApp(): { app: Hono<ApiEnv>; child: ReturnType<typeof vi.fn> } {
  const child = vi.fn(() => ({ child }));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- middleware only reads logger
  const container = { logger: { child } } as unknown as AppContainer;

  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.set("container", container);
    await next();
  });
  app.use("*", requestIdMiddleware);
  app.get("/thing", (c) => c.json({ requestId: c.get("requestId") }));

  return { app, child };
}

describe("requestIdMiddleware", () => {
  it("propagates an inbound request id", async () => {
    const { app, child } = createTestApp();

    const res = await app.request("/thing", {
      headers: { "x-request-id": "  req-from-proxy  " },
    });

    expect(res.headers.get("x-request-id")).toBe("req-from-proxy");
    await expect(res.json()).resolves.toEqual({ requestId: "req-from-proxy" });
    // The request-scoped logger carries the id so every line correlates.
    expect(child).toHaveBeenCalledWith({ requestId: "req-from-proxy" });
  });

  it("generates an id when none arrives", async () => {
    const { app } = createTestApp();

    const res = await app.request("/thing");
    const generated = res.headers.get("x-request-id");

    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
    await expect(res.json()).resolves.toEqual({ requestId: generated });
  });

  it("generates an id when the inbound header is blank", async () => {
    const { app } = createTestApp();

    const res = await app.request("/thing", { headers: { "x-request-id": "   " } });

    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
