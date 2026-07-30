// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { authorize } from "./authorize.ts";
export { can, type AuthzResource } from "./can.ts";
export { allow, deny, type Decision } from "./decision.ts";
export {
  ALL_ACTIONS,
  DESTRUCTIVE_WHILE_IMPERSONATING,
  PERMISSIONS,
  type Action,
} from "./permissions.ts";
export {
  actionsMissingFrom,
  assertOwnerCoversAllActions,
  permissionsForRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from "./roles.ts";

export type { Actor, OrganizationRole, Permission } from "@repo/types";
