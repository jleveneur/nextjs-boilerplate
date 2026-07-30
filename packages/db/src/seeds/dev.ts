/**
 * Dev seed — a realistic local dataset for clicking through the product.
 *
 * Deterministic ids so re-running the seed upserts rather than duplicating.
 */

import type { Database } from "../client.ts";
import { user } from "../schema/auth.sql.ts";
import { member, organization } from "../schema/organization.sql.ts";

/** Fixed UUIDv7-shaped ids — stable across `make db-reset` runs. */
const DEV_USER_ID = "01900000-0000-7000-8000-000000000001";
const DEV_ORG_ID = "01900000-0000-7000-8000-000000000010";
const DEV_MEMBER_ID = "01900000-0000-7000-8000-000000000011";

export async function seedDev(db: Database): Promise<void> {
  await db
    .insert(user)
    .values({
      id: DEV_USER_ID,
      name: "Dev Owner",
      email: "dev@example.com",
      emailVerified: true,
    })
    .onConflictDoNothing({ target: user.id });

  await db
    .insert(organization)
    .values({
      id: DEV_ORG_ID,
      name: "Acme Dev",
      slug: "acme-dev",
    })
    .onConflictDoNothing({ target: organization.id });

  await db
    .insert(member)
    .values({
      id: DEV_MEMBER_ID,
      organizationId: DEV_ORG_ID,
      userId: DEV_USER_ID,
      role: "owner",
    })
    .onConflictDoNothing({ target: member.id });
}
