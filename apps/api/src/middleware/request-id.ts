import { runWithLogger } from "@repo/logger";
import { generateUuidV7 } from "@repo/utils";
import type { MiddlewareHandler } from "hono";

import type { ApiEnv } from "../app.ts";

const HEADER = "x-request-id";

/** Assign or propagate `X-Request-Id` and bind a request-scoped logger. */
export const requestIdMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const incoming = c.req.header(HEADER);
  const requestId =
    incoming !== undefined && incoming.trim() !== "" ? incoming.trim() : generateUuidV7();
  c.set("requestId", requestId);
  c.header(HEADER, requestId);

  const logger = c.get("container").logger.child({ requestId });
  await runWithLogger(logger, () => next());
};
