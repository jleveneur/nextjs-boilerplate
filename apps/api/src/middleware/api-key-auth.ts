import { resolveActorFromApiKey } from "@repo/auth";
import type { Ctx } from "@repo/core";
import { UnauthorizedError } from "@repo/errors";
import type { MiddlewareHandler } from "hono";

import type { ApiEnv } from "../app.ts";

function bearerToken(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() === "" ? undefined : match?.[1]?.trim();
}

/**
 * Resolve an {@link Actor} from `Authorization: Bearer <api_key>` and build
 * the core {@link Ctx}. Public `/v1` routes require this; webhooks do not.
 */
export const apiKeyAuthMiddleware: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const container = c.get("container");
  const token = bearerToken(c.req.header("authorization"));
  if (token === undefined) {
    throw new UnauthorizedError({ message: "Missing or invalid Authorization bearer token" });
  }

  const actor = await resolveActorFromApiKey({ auth: container.auth, key: token });
  if (actor === undefined) {
    throw new UnauthorizedError({ message: "Invalid API key" });
  }

  const ctx: Ctx = {
    actor,
    db: container.db,
    logger: container.logger.child({
      requestId: c.get("requestId"),
      userId: actor.userId,
      organizationId: actor.organizationId,
    }),
    ports: container.ports,
  };

  c.set("actor", actor);
  c.set("apiKey", token);
  c.set("ctx", ctx);
  await next();
};
