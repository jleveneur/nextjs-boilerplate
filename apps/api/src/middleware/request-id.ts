import { generateUuidV7 } from "@repo/utils";
import type { MiddlewareHandler } from "hono";

import type { ApiEnv } from "../app.ts";

const HEADER = "x-request-id";

/** Assign or propagate `X-Request-Id` for correlation in logs and problem+json. */
export const requestIdMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const incoming = c.req.header(HEADER);
  const requestId =
    incoming !== undefined && incoming.trim() !== "" ? incoming.trim() : generateUuidV7();
  c.set("requestId", requestId);
  c.header(HEADER, requestId);
  await next();
};
