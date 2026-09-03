/**
 * Shared oRPC builder, AppError mapping, and layered procedures.
 */

import { ORPCError, os } from "@orpc/server";
import { isAppError } from "@repo/errors";

import { toServiceCtx, type OrpcContext } from "./context.ts";
import { toOrpcError } from "./map-app-error.ts";

const base = os.$context<OrpcContext>();

/**
 * Catch handler throws and remap AppError to ORPCError so the wire keeps a
 * stable `data.appCode`.
 */
const mapErrors = base.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw isAppError(error) ? toOrpcError(error) : error;
  }
});

export const publicProcedure = base.use(mapErrors);

export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (context.actor === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  return next({
    context: {
      actor: context.actor,
    },
  });
});

/**
 * Requires an authenticated actor with an active organization (tenant).
 * Exposes `serviceCtx` ready for `@repo/core` services.
 */
export const orgProcedure = protectedProcedure.use(({ context, next }) => {
  if (context.actor === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  return next({
    context: {
      actor: context.actor,
      serviceCtx: toServiceCtx({
        actor: context.actor,
        db: context.db,
        logger: context.logger,
        ports: context.ports,
      }),
    },
  });
});
