import { asc, eq, isNull } from "drizzle-orm";

import { user } from "../schema/auth.sql.ts";
import { member } from "../schema/organization.sql.ts";
import { scopedWhere, type TenantCtx } from "../tenant.ts";

export async function findOrganizationOwnerEmail(ctx: TenantCtx): Promise<string | null> {
  const rows = await ctx.db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(scopedWhere(ctx, member, eq(member.role, "owner"), isNull(user.deletedAt)))
    .orderBy(asc(member.createdAt), asc(member.id))
    .limit(1);

  return rows[0]?.email ?? null;
}
