import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { securityHeadersMiddleware } from "./security-headers.ts";

describe("securityHeadersMiddleware", () => {
  it("sets baseline headers on every response", async () => {
    const app = new Hono();
    app.use("*", securityHeadersMiddleware);
    app.get("/health", (c) => c.json({ status: "ok" }));

    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });
});
