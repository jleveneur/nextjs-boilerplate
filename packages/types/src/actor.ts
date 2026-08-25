/**
 * Resolved caller identity used by authorization and application services.
 *
 * Built once at the transport edge (session or API key). Lives in layer 0 so
 * `@repo/auth` and `@repo/authz` can share the shape without a same-layer import.
 */

import type { OrganizationId, UserId } from "./ids.ts";

/** Better Auth organization roles — static, code-defined (ADR-0005). */
export type OrganizationRole = "owner" | "admin" | "member";

/**
 * A single RBAC grant as `resource:action` (e.g. `invoice:void`).
 * The permission registry in `@repo/authz` owns the closed set of values.
 */
export type Permission = `${string}:${string}`;

/**
 * Who is acting. There is no ambient "current user" — every tenant-scoped
 * service takes an explicit actor.
 */
export type Actor = {
  userId: UserId;
  organizationId: OrganizationId;
  role: OrganizationRole;
  /** Role defaults for sessions; role defaults ∩ the explicit API-key subset for keys. */
  permissions: readonly Permission[];
  /** Cross-tenant / support path — never from a normal session. */
  isSystem: boolean;
  /** Better Auth admin impersonation — bars destructive actions in authz. */
  isImpersonating?: boolean;
};
