import { describe, expect, it } from "vitest";

import { setupDbIntegrationTests } from "../testing/harness.ts";
import { findAssetById } from "./asset.repository.ts";

describe("findAssetById", () => {
  const { withTestTransaction } = setupDbIntegrationTests();

  it("returns an asset that belongs to the tenant", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const owner = await factories.makeUser();
      const org = await factories.makeOrganization();
      await factories.makeMember({
        organizationId: org.id,
        userId: owner.id,
        role: "owner",
      });
      const created = await factories.makeAsset({
        organizationId: org.id,
        ownerUserId: owner.id,
      });

      const found = await findAssetById({ organizationId: org.id, db }, created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.organizationId).toBe(org.id);
    });
  });

  it("does not return another tenant's asset (cross-tenant isolation)", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const owner = await factories.makeUser();
      const orgA = await factories.makeOrganization({ slug: "org-a" });
      const orgB = await factories.makeOrganization({ slug: "org-b" });
      await factories.makeMember({
        organizationId: orgA.id,
        userId: owner.id,
        role: "owner",
      });
      await factories.makeMember({
        organizationId: orgB.id,
        userId: owner.id,
        role: "owner",
      });

      const assetInB = await factories.makeAsset({
        organizationId: orgB.id,
        ownerUserId: owner.id,
      });

      // Actor in org A asks for org B's asset id — must look like "not found".
      const found = await findAssetById({ organizationId: orgA.id, db }, assetInB.id);

      expect(found).toBeNull();
    });
  });
});
