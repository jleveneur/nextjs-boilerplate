// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import {
  isOrganizationRole,
  permissionsForOrganizationRole,
  resolveActor,
  type Auth,
} from "@repo/auth";
import { organizationIdSchema, userIdSchema } from "@repo/contracts";
import type { Actor } from "@repo/types";
import type { TrpcContext } from "@repo/trpc";

import { getContainer } from "./container.ts";

async function resolveOrganizationActor(
  auth: Auth,
  headers: Headers,
  organizationSlug: string,
): Promise<Actor | undefined> {
  const [session, organizations] = await Promise.all([
    auth.api.getSession({ headers }),
    auth.api.listOrganizations({ headers }),
  ]);
  if (session === null) {
    return undefined;
  }

  const organization = organizations.find(({ slug }) => slug === organizationSlug);
  if (organization === undefined) {
    return undefined;
  }

  const member = await auth.api.getActiveMemberRole({
    headers,
    query: { organizationId: organization.id },
  });
  const role = isOrganizationRole(member.role) ? member.role : "member";
  const impersonatedBy = session.session.impersonatedBy;

  return {
    userId: userIdSchema.parse(session.user.id),
    organizationId: organizationIdSchema.parse(organization.id),
    role,
    permissions: permissionsForOrganizationRole(role),
    isSystem: false,
    ...(impersonatedBy === null || impersonatedBy === undefined || impersonatedBy === ""
      ? {}
      : { isImpersonating: true }),
  };
}

/** Build per-request tRPC context (session verified here, not in proxy). */
export async function createTrpcContext(
  headers: Headers,
  options?: { organizationSlug: string },
): Promise<TrpcContext> {
  const { auth, db, logger, ports } = getContainer();
  const actor =
    (options === undefined
      ? await resolveActor({ auth, headers })
      : await resolveOrganizationActor(auth, headers, options.organizationSlug)) ?? null;
  return { actor, db, logger, ports };
}
