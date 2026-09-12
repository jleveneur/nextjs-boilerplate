import { ORPCError } from "@orpc/server";

import { auth } from "@repo/auth";
import type { statement } from "@repo/authz";

import { orgProcedure } from "./procedures.ts";

/** A permission request, e.g. `{ post: ["delete"] }`. Keys come from `@repo/authz`. */
export type Permissions = Partial<{
  [K in keyof typeof statement]: (typeof statement)[K][number][];
}>;

/**
 * Requires the caller's role in the active organization to grant `permissions`.
 *
 * Authorization is asked of Better Auth rather than re-derived from the
 * session: the role lives on the member row, and a check that reads anything
 * else is a second source of truth waiting to disagree with the first.
 */
export function requirePermission(permissions: Permissions) {
  return orgProcedure.use(async ({ context, next }) => {
    const allowed = await auth.api.hasPermission({
      headers: context.headers,
      body: { organizationId: context.organizationId, permissions },
    });

    if (!allowed.success) {
      throw new ORPCError("FORBIDDEN", {
        message: `Your role does not allow ${describe(permissions)}`,
      });
    }

    return next();
  });
}

function describe(permissions: Permissions): string {
  return Object.entries(permissions)
    .map(([resource, actions]) => `${actions?.join("/") ?? ""} on ${resource}`)
    .join(", ");
}
