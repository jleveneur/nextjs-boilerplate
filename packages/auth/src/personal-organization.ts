import { eq } from "drizzle-orm";

import { db, member, organization, user } from "@repo/db";

/**
 * Returns the organization a user belongs to, creating their own the first time.
 *
 * Every user needs a tenant before they can do anything, and a personal
 * organization is invisible for a single-user product while already being
 * correct for a team one — so nobody has to be shown an onboarding form to
 * name a workspace before they have seen the product.
 *
 * This runs from the session-creation hook rather than the user-creation one.
 * Better Auth queues `create.after` hooks to run once the surrounding
 * transaction has finished, so at sign-up a user hook has not run yet by the
 * time the session is written — and the session would be saved with no active
 * organization. Resolving it here is also self-healing: a user who somehow has
 * no organization gets one on their next sign-in.
 */
export async function ensurePersonalOrganization(userId: string): Promise<string> {
  const [existing] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(member.createdAt)
    .limit(1);

  if (existing !== undefined) {
    return existing.organizationId;
  }

  const [owner] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (owner === undefined) {
    throw new Error(`Cannot create an organization for unknown user ${userId}`);
  }

  const organizationId = crypto.randomUUID();
  const handle =
    owner.email
      .split("@")[0]
      ?.replaceAll(/[^a-z0-9-]/gi, "-")
      .toLowerCase() ?? "";

  await db.transaction(async (tx) => {
    await tx.insert(organization).values({
      id: organizationId,
      name: `${owner.name}'s workspace`,
      // The id suffix is what makes this unique without a round trip to check;
      // the handle is only there to keep it readable.
      slug: `${handle || "workspace"}-${organizationId.slice(0, 8)}`,
    });

    await tx.insert(member).values({
      id: crypto.randomUUID(),
      organizationId,
      userId,
      role: "owner",
    });
  });

  return organizationId;
}
