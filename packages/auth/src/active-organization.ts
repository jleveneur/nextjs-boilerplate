import { eq } from "drizzle-orm";

import { db, member, organization, user } from "@repo/db";

/**
 * Decides which organization a session should start in.
 *
 * Order of preference: the organization the user was last working in, then
 * their oldest membership, then a personal organization created on the spot.
 *
 * The lookup itself is not overhead this function adds — a session cannot
 * start in an organization without knowing which one. What it adds is the
 * fallback, and that only writes the first time a user ever signs in.
 */
export async function resolveActiveOrganization(userId: string): Promise<string> {
  const rows = await db
    .select({
      organizationId: member.organizationId,
      remembered: user.lastActiveOrganizationId,
    })
    .from(user)
    .leftJoin(member, eq(member.userId, user.id))
    .where(eq(user.id, userId))
    .orderBy(member.createdAt);

  const first = rows[0];
  if (first === undefined) {
    throw new Error(`Cannot resolve an organization for unknown user ${userId}`);
  }

  const memberships = rows
    .map((row) => row.organizationId)
    .filter((id): id is string => id !== null);

  const oldest = memberships[0];
  if (oldest === undefined) {
    return createPersonalOrganization(userId);
  }

  // The remembered id is only honoured if it is still one of their
  // memberships, which is what makes it safe to store without a foreign key.
  return memberships.find((id) => id === first.remembered) ?? oldest;
}

/**
 * Gives a user an organization of their own.
 *
 * Every user needs a tenant before they can do anything, and a personal
 * organization is invisible for a single-user product while already being
 * correct for a team one — so nobody is shown an onboarding form asking them
 * to name a workspace before they have seen the product.
 */
export async function createPersonalOrganization(userId: string): Promise<string> {
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

/**
 * Mirrors a session's active organization onto the user, so the choice
 * outlives the session.
 *
 * Called from the session-update hook, which means Better Auth has already
 * verified membership before writing the session — re-checking it here would
 * be a second query answering a question that is already settled.
 */
export async function rememberActiveOrganization(
  userId: string,
  organizationId: string,
): Promise<void> {
  await db
    .update(user)
    .set({ lastActiveOrganizationId: organizationId })
    .where(eq(user.id, userId));
}
