/**
 * Data factories for integration tests.
 *
 * A test states only what matters; everything else gets a sensible default.
 * Shared fixture files that many tests depend on become untouchable — factories
 * do not.
 */

import type { AssetId, MemberId, OrganizationId, UserId } from "@repo/types";
import { generateUuidV7 } from "@repo/utils";

import { asset } from "../schema/asset.sql.ts";
import { user } from "../schema/auth.sql.ts";
import { member, organization } from "../schema/organization.sql.ts";
import type { DbExecutor } from "../with-transaction.ts";

export type Factories = ReturnType<typeof createFactories>;

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test factory brand constructor
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test factory brand constructor
  return id as OrganizationId;
}

function brandMemberId(id: string): MemberId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test factory brand constructor
  return id as MemberId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test factory brand constructor
  return id as AssetId;
}

export function createFactories(db: DbExecutor) {
  return {
    async makeUser(overrides: Partial<typeof user.$inferInsert> = {}) {
      const id = overrides.id ?? generateUuidV7();
      const [row] = await db
        .insert(user)
        .values({
          id,
          name: overrides.name ?? "Test User",
          email: overrides.email ?? `${id}@example.com`,
          emailVerified: overrides.emailVerified ?? true,
          ...overrides,
        })
        .returning();

      if (row === undefined) {
        throw new Error("makeUser: insert returned no row");
      }

      return { ...row, id: brandUserId(row.id) };
    },

    async makeOrganization(overrides: Partial<typeof organization.$inferInsert> = {}) {
      const id = overrides.id ?? generateUuidV7();
      const [row] = await db
        .insert(organization)
        .values({
          id,
          name: overrides.name ?? "Test Org",
          slug: overrides.slug ?? `org-${id.slice(0, 8)}`,
          ...overrides,
        })
        .returning();

      if (row === undefined) {
        throw new Error("makeOrganization: insert returned no row");
      }

      return { ...row, id: brandOrganizationId(row.id) };
    },

    async makeMember(input: {
      organizationId: OrganizationId;
      userId: UserId;
      role?: string;
      id?: string;
    }) {
      const id = input.id ?? generateUuidV7();
      const [row] = await db
        .insert(member)
        .values({
          id,
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role ?? "member",
        })
        .returning();

      if (row === undefined) {
        throw new Error("makeMember: insert returned no row");
      }

      return { ...row, id: brandMemberId(row.id) };
    },

    async makeAsset(input: {
      organizationId: OrganizationId;
      ownerUserId: UserId;
      status?: "pending" | "ready" | "failed";
      storageKey?: string;
      contentType?: string;
      id?: string;
    }) {
      const id = input.id ?? generateUuidV7();
      const [row] = await db
        .insert(asset)
        .values({
          id,
          organizationId: input.organizationId,
          ownerUserId: input.ownerUserId,
          status: input.status ?? "ready",
          storageKey: input.storageKey ?? `org/${input.organizationId}/${id}`,
          contentType: input.contentType ?? "application/octet-stream",
        })
        .returning();

      if (row === undefined) {
        throw new Error("makeAsset: insert returned no row");
      }

      return { ...row, id: brandAssetId(row.id) };
    },
  };
}
