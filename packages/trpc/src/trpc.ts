/**
 * initTRPC, SuperJSON transformer, AppError mapping, and layered procedures.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { isAppError } from "@repo/errors";
import superjson from "superjson";

import { toServiceCtx, type TrpcContext } from "./context.ts";
import { formatTrpcError } from "./error-formatter.ts";
import { rethrowAsTrpc, toTrpcError } from "./map-app-error.ts";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return formatTrpcError({
      shape: { message: shape.message, data: { ...shape.data } },
      error,
    });
  },
});

/**
 * tRPC's middleware `next()` catches resolver throws and returns
 * `{ ok: false, error }` (it does not rethrow). Remap AppError causes here.
 */
const mapErrors = t.middleware(async ({ next }) => {
  try {
    const result = await next();
    if (!result.ok) {
      const cause = result.error.cause;
      if (isAppError(cause)) {
        return {
          ok: false,
          error: toTrpcError(cause),
          marker: result.marker,
        };
      }
    }

    return result;
  } catch (error) {
    return rethrowAsTrpc(error);
  }
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure.use(mapErrors);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (ctx.actor === null) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  return next({
    ctx: {
      ...ctx,
      actor: ctx.actor,
    },
  });
});

/**
 * Requires an authenticated actor with an active organization (tenant).
 * Exposes `serviceCtx` ready for `@repo/core` services.
 */
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  // Actor.organizationId is required on the type; this middleware is the
  // structural guarantee that tenant-scoped services always receive it.
  return next({
    ctx: {
      ...ctx,
      serviceCtx: toServiceCtx(ctx),
    },
  });
});
