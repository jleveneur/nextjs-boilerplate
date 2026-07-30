/**
 * Test seed — minimal deterministic fixtures for E2E.
 *
 * Integration tests prefer factories; this tier is for Playwright and other
 * whole-app flows that boot against a seeded database.
 */

import type { Database } from "../client.ts";
import { user } from "../schema/auth.sql.ts";
import { member, organization } from "../schema/organization.sql.ts";

const TEST_USER_ID = "01900000-0000-7000-8000-000000000101";
const TEST_ORG_A_ID = "01900000-0000-7000-8000-000000000110";
const TEST_ORG_B_ID = "01900000-0000-7000-8000-000000000120";
const TEST_MEMBER_A_ID = "01900000-0000-7000-8000-000000000111";
const TEST_MEMBER_B_ID = "01900000-0000-7000-8000-000000000121";

export async function seedTest(db: Database): Promise<void> {
  await db
    .insert(user)
    .values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
    })
    .onConflictDoNothing({ target: user.id });

  await db
    .insert(organization)
    .values([
      { id: TEST_ORG_A_ID, name: "Org Alpha", slug: "org-alpha" },
      { id: TEST_ORG_B_ID, name: "Org Beta", slug: "org-beta" },
    ])
    .onConflictDoNothing({ target: organization.id });

  await db
    .insert(member)
    .values([
      {
        id: TEST_MEMBER_A_ID,
        organizationId: TEST_ORG_A_ID,
        userId: TEST_USER_ID,
        role: "owner",
      },
      {
        id: TEST_MEMBER_B_ID,
        organizationId: TEST_ORG_B_ID,
        userId: TEST_USER_ID,
        role: "owner",
      },
    ])
    .onConflictDoNothing({ target: member.id });
}
