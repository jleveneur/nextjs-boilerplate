import { createHash } from "node:crypto";

import { ConflictError, ValidationError } from "@repo/errors";
import type { MiddlewareHandler } from "hono";

import type { ApiEnv } from "../app.ts";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;
const HEADER = "idempotency-key";

type StoredResponse = {
  bodyHash: string;
  status: number;
  body: string;
  contentType: string;
};

function isMutation(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function hashBody(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Replay identical mutation responses for 24h when `Idempotency-Key` is set.
 *
 * Required on mutating `/v1` requests. Same key + different body → 409.
 */
export const idempotencyMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (!isMutation(c.req.method)) {
    await next();
    return;
  }

  const key = c.req.header(HEADER)?.trim();
  if (key === undefined || key === "") {
    throw new ValidationError({
      message: "Idempotency-Key header is required for mutating requests",
      fieldErrors: [{ path: "Idempotency-Key", message: "Required" }],
    });
  }

  // Clone so route handlers can still call `c.req.json()`.
  const rawBody = await c.req.raw.clone().text();
  const bodyHash = hashBody(rawBody);

  const apiKey = c.get("apiKey");
  const fingerprint = createHash("sha256").update(apiKey).digest("hex").slice(0, 32);
  const cacheKey = {
    namespace: "api-idempotency",
    version: 1,
    key: `${fingerprint}:${key}`,
    organizationId: c.get("actor").organizationId,
  };

  const cache = c.get("container").cache;
  const stored = await cache.get<StoredResponse>(cacheKey);
  if (stored !== undefined) {
    if (stored.bodyHash !== bodyHash) {
      throw new ConflictError({
        message: "Idempotency-Key was reused with a different request body",
      });
    }
    c.res = new Response(stored.body, {
      status: stored.status,
      headers: {
        "content-type": stored.contentType,
        "x-idempotent-replay": "true",
      },
    });
    return;
  }

  await next();

  const response = c.res;
  const responseBody = await response.clone().text();
  const contentType = response.headers.get("content-type") ?? "application/json";

  if (response.status >= 200 && response.status < 500) {
    await cache.set({ ...cacheKey, ttlSeconds: IDEMPOTENCY_TTL_SECONDS }, {
      bodyHash,
      status: response.status,
      body: responseBody,
      contentType,
    } satisfies StoredResponse);
  }
};
