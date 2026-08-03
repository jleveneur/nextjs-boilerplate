import { describe, expect, it } from "vitest";

import { setupDbIntegrationTests } from "../testing/harness.ts";
import { findOrganizationOwnerEmail } from "./organization.repository.ts";

describe("findOrganizationOwnerEmail", () => {
  const { withTestTransaction } = setupDbIntegrationTests();

  it("returns an active owner email for the requested organization", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const otherOrg = await factories.makeOrganization();
      const memberUser = await factories.makeUser({ email: "member@example.com" });
      const deletedOwner = await factories.makeUser({
        email: "deleted-owner@example.com",
        deletedAt: new Date(),
      });
      const activeOwner = await factories.makeUser({ email: "owner@example.com" });
      const otherOwner = await factories.makeUser({ email: "other-owner@example.com" });

      await factories.makeMember({
        organizationId: org.id,
        userId: memberUser.id,
        role: "member",
      });
      await factories.makeMember({
        organizationId: org.id,
        userId: deletedOwner.id,
        role: "owner",
      });
      await factories.makeMember({
        organizationId: org.id,
        userId: activeOwner.id,
        role: "owner",
      });
      await factories.makeMember({
        organizationId: otherOrg.id,
        userId: otherOwner.id,
        role: "owner",
      });

      await expect(findOrganizationOwnerEmail({ organizationId: org.id, db })).resolves.toBe(
        "owner@example.com",
      );
    });
  });

  it("returns null when the organization has no active owner", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      const deletedOwner = await factories.makeUser({ deletedAt: new Date() });
      await factories.makeMember({
        organizationId: org.id,
        userId: deletedOwner.id,
        role: "owner",
      });

      await expect(findOrganizationOwnerEmail({ organizationId: org.id, db })).resolves.toBeNull();
    });
  });
});
