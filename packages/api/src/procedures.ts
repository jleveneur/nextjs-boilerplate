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

/**
 * Requires an active organization, and exposes it as `context.organizationId`.
 *
 * This is the tenant boundary. Every query a handler below it runs must filter
 * on this id — an unfiltered query is a data leak, not a bug.
 */
export const orgProcedure = protectedProcedure.use(({ context, next }) => {
  const organizationId = context.session?.session.activeOrganizationId;

  if (organizationId === null || organizationId === undefined) {
    throw new ORPCError("FORBIDDEN", { message: "No active organization" });
  }

  return next({ context: { organizationId } });
});
