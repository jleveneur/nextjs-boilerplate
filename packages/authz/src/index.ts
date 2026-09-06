// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { authorize } from "./authorize.ts";
export { can, type AuthzResource } from "./can.ts";
export { allow, deny, type Decision } from "./decision.ts";

// The registry itself lives in `@repo/permissions` (layer 0) so `@repo/auth` can
// read the same declaration without a same-layer import. Re-exported here so a
// caller that already depends on authz for `can` does not need a second import.
export {
  actionsMissingFrom,
  ALL_ACTIONS,
  assertOwnerCoversAllActions,
  DESTRUCTIVE_WHILE_IMPERSONATING,
  PERMISSIONS,
  permissionsForRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
  type Action,
} from "@repo/permissions";

export type { Actor, OrganizationRole, Permission } from "@repo/types";
