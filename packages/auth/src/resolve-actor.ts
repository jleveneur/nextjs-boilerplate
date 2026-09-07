/**
 * Resolve a shared {@link Actor} from the session.
 *
 * Every transport builds an `Actor` through here so a slice service never sees a
 * transport-shaped caller (docs/architecture/07-auth.md §3).
 */

import { isOrganizationRole, permissionsForRole } from "@repo/permissions";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import type { Auth } from "./create-auth.ts";

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- boundary brand from Better Auth
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- boundary brand from Better Auth
  return id as OrganizationId;
}

export type ResolveActorFromSessionInput = {
  auth: Auth;
  headers: Headers;
};

/** Session-cookie path — builds an {@link Actor} for the active organization. */
export async function resolveActor(
  input: ResolveActorFromSessionInput,
): Promise<Actor | undefined> {
  const session = await input.auth.api.getSession({ headers: input.headers });
  if (session === null) {
    return undefined;
  }

  const organizationId = session.session.activeOrganizationId;
  if (organizationId === null || organizationId === undefined || organizationId === "") {
    return undefined;
  }

  const activeMember = await input.auth.api.getActiveMember({ headers: input.headers });
  const roleRaw = activeMember?.role ?? "member";
  const role = isOrganizationRole(roleRaw) ? roleRaw : "member";

  const impersonatedBy = session.session.impersonatedBy;

  return {
    userId: brandUserId(session.user.id),
    organizationId: brandOrganizationId(organizationId),
    role,
    permissions: permissionsForRole(role),
    isSystem: false,
    ...(impersonatedBy === null || impersonatedBy === undefined || impersonatedBy === ""
      ? {}
      : { isImpersonating: true }),
  };
}
