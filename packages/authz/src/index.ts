// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { authorize } from "./authorize.ts";
export { can, type AuthzResource } from "./can.ts";
export { allow, deny, type Decision } from "./decision.ts";

// Types only, from strictly below. `Action` is re-exported because it is the
// parameter type of `can`, so it is part of this package's own signature; the
// registry values are not, and a caller that needs them imports
// `@repo/permissions` directly rather than through here. Two import paths for one
// constant is the duplication this package was just untangled from.
export type { Action } from "@repo/permissions";
export type { Actor, OrganizationRole, Permission } from "@repo/types";
