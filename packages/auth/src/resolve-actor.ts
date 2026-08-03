/**
 * Resolve a shared {@link Actor} from a session or API key.
 *
 * Session and API-key paths must produce the same shape so `@repo/core` cannot
 * tell them apart (docs/architecture/07-auth.md §3).
 */

import type { Actor, OrganizationId, Permission, UserId } from "@repo/types";

import type { Auth } from "./create-auth.ts";
import { isOrganizationRole, permissionsForOrganizationRole } from "./role-permissions.ts";

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- boundary brand from Better Auth
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- boundary brand from Better Auth
  return id as OrganizationId;
}

function permissionsFromApiKeyRecord(raw: unknown): readonly Permission[] | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return permissionsFromApiKeyRecord(parsed);
    } catch {
      return [];
    }
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }

  const record = Object.fromEntries(Object.entries(raw));
  const permissions: Permission[] = [];
  for (const [resource, actions] of Object.entries(record)) {
    if (!Array.isArray(actions)) {
      continue;
    }

    for (const action of actions) {
      if (typeof action === "string") {
        permissions.push(`${resource}:${action}`);
      }
    }
  }

  return permissions;
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
    permissions: permissionsForOrganizationRole(role),
    isSystem: false,
    ...(impersonatedBy === null || impersonatedBy === undefined || impersonatedBy === ""
      ? {}
      : { isImpersonating: true }),
  };
}

export type ResolveActorFromApiKeyInput = {
  auth: Auth;
  key: string;
  /** Role used when the key does not encode one — typically the creating member's role. */
  fallbackRole?: Actor["role"];
};

export async function resolveActorFromApiKey(
  input: ResolveActorFromApiKeyInput,
): Promise<Actor | undefined> {
  const result = await input.auth.api.verifyApiKey({
    body: { key: input.key },
  });

  if (!result.valid || result.key === null) {
    return undefined;
  }

  // `verifyApiKey` updates `request_count` / `last_request` — that is the
  // per-key usage signal for deprecation (§5 Q6).

  const organizationId = result.key.referenceId;
  const role = input.fallbackRole ?? "member";
  const rolePermissions = permissionsForOrganizationRole(role);
  const fromKey = permissionsFromApiKeyRecord(result.key.permissions);
  const requestedPermissions = fromKey === undefined ? undefined : new Set(fromKey);
  const permissions =
    requestedPermissions === undefined
      ? rolePermissions
      : rolePermissions.filter((permission) => requestedPermissions.has(permission));

  // Org-owned keys store the creating user in metadata (set at creation time).
  const metadata = result.key.metadata;
  let metadataUserId: string | undefined;
  if (typeof metadata === "object" && metadata !== null && "userId" in metadata) {
    const value: unknown = Reflect.get(metadata, "userId");
    if (typeof value === "string") {
      metadataUserId = value;
    }
  }

  if (metadataUserId === undefined) {
    return undefined;
  }

  return {
    userId: brandUserId(metadataUserId),
    organizationId: brandOrganizationId(organizationId),
    role,
    permissions,
    isSystem: false,
  };
}
