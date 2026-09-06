export {
  actionOf,
  ALL_ACTIONS,
  BUILT_IN_RESOURCES,
  DESTRUCTIVE_WHILE_IMPERSONATING,
  PERMISSIONS,
  productResources,
  resourceOf,
  toStatements,
  type Action,
  type BuiltInResource,
} from "./registry.ts";
export {
  actionsMissingFrom,
  assertOwnerCoversAllActions,
  isOrganizationRole,
  permissionsForRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from "./roles.ts";

export type { OrganizationRole, Permission } from "@repo/types";
