import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, post } from "@repo/db";

import { protectedProcedure, publicProcedure } from "./procedures.ts";

/**
 * The API surface.
 *
 * `post` is the example slice: it exists to show a validated input, a
 * tenant-scoped query, and a mutation working end to end. Delete it when you
 * add a real domain.
 */
export const appRouter = {
  health: publicProcedure.handler(() => ({ status: "ok" as const })),

  post: {
    list: protectedProcedure.handler(({ context }) =>
      db.select().from(post).where(eq(post.userId, context.user.id)).orderBy(desc(post.createdAt)),
    ),

    create: protectedProcedure
      .input(z.object({ title: z.string().trim().min(1).max(200) }))
      .handler(async ({ input, context }) => {
        const [created] = await db
          .insert(post)
          .values({ title: input.title, userId: context.user.id })
          .returning();

        if (created === undefined) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Insert returned no row" });
        }

        return created;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .handler(async ({ input, context }) => {
        // Scoping the delete by user is what makes this authorization rather
        // than a suggestion: a caller cannot delete a row they do not own.
        await db.delete(post).where(and(eq(post.id, input.id), eq(post.userId, context.user.id)));
        return { id: input.id };
      }),
  },
};

export type AppRouter = typeof appRouter;
