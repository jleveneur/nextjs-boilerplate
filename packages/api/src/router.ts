import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, member, organization, post } from "@repo/db";

import { orgProcedure, publicProcedure } from "./procedures.ts";
import { requirePermission } from "./require-permission.ts";

/**
 * The API surface.
 *
 * `post` is the example slice: it exists to show a validated input, a
 * tenant-scoped query, and a permission-gated mutation working end to end.
 * Delete it when you add a real domain.
 */
export const appRouter = {
  health: publicProcedure.handler(() => ({ status: "ok" as const })),

  organization: {
    /** The active organization and the caller's role in it. */
    current: orgProcedure.handler(async ({ context }) => {
      const [row] = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(
          and(
            eq(member.organizationId, context.organizationId),
            eq(member.userId, context.user.id),
          ),
        )
        .limit(1);

      if (row === undefined) {
        throw new ORPCError("FORBIDDEN", { message: "Not a member of the active organization" });
      }

      return row;
    }),
  },

  post: {
    list: orgProcedure.handler(({ context }) =>
      db
        .select()
        .from(post)
        .where(eq(post.organizationId, context.organizationId))
        .orderBy(desc(post.createdAt)),
    ),

    create: requirePermission({ post: ["create"] })
      .input(z.object({ title: z.string().trim().min(1).max(200) }))
      .handler(async ({ input, context }) => {
        const [created] = await db
          .insert(post)
          .values({
            title: input.title,
            organizationId: context.organizationId,
            userId: context.user.id,
          })
          .returning();

        if (created === undefined) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Insert returned no row" });
        }

        return created;
      }),

    delete: requirePermission({ post: ["delete"] })
      .input(z.object({ id: z.uuid() }))
      .handler(async ({ input, context }) => {
        // Scoping the delete by organization is what makes the permission check
        // meaningful: without it, an admin of one tenant could delete another
        // tenant's row by guessing an id.
        await db
          .delete(post)
          .where(and(eq(post.id, input.id), eq(post.organizationId, context.organizationId)));

        return { id: input.id };
      }),
  },
};

export type AppRouter = typeof appRouter;
