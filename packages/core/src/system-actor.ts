/**
 * System actor for worker / relay paths that are not a human session.
 *
 * `isSystem: true` bypasses RBAC in `@repo/authz`; repositories must still
 * scope by the organization id carried on the actor (or use explicit system
 * queries for cross-tenant reconcile).
 */

import type { Actor, OrganizationId, UserId } from "@repo/types";

/** Stable UUIDv7 used only as a placeholder user id on system actors. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- well-known system sentinel
const SYSTEM_USER_ID = "01900000-0000-7000-8000-000000000000" as UserId;

export function systemActorForOrganization(organizationId: OrganizationId): Actor {
  return {
    userId: SYSTEM_USER_ID,
    organizationId,
    role: "owner",
    permissions: [],
    isSystem: true,
  };
}
