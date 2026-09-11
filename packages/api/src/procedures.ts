import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context.ts";

/** Base builder. Anyone can call these, signed in or not. */
export const publicProcedure = os.$context<Context>();

/**
 * Requires a signed-in caller and narrows `context.user` for the handler, so a
 * procedure cannot forget the check and read an optional user by accident.
 */
export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (context.session === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
  }

  return next({ context: { user: context.session.user } });
});
