/**
 * Invoice persistence — the only billing file that touches `@repo/db`.
 */

import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { scopedWhere, type TenantCtx } from "@repo/db";
import { invoice, type InvoiceStatus } from "@repo/db/schema";
import type { InvoiceId } from "@repo/types";

export type { InvoiceStatus };
export type InvoiceRow = typeof invoice.$inferSelect;

export type InsertInvoiceInput = {
  id: InvoiceId;
  number: string;
  status: InvoiceStatus;
  amountMinor: number;
  currency: string;
};

export type ListInvoicesQuery = {
  limit: number;
  cursor?: { createdAt: Date; id: string };
};

export async function insertInvoice(
  ctx: TenantCtx,
  input: InsertInvoiceInput,
): Promise<InvoiceRow> {
  const [row] = await ctx.db
    .insert(invoice)
    .values({
      id: input.id,
      organizationId: ctx.organizationId,
      number: input.number,
      status: input.status,
      amountMinor: input.amountMinor,
      currency: input.currency,
    })
    .returning();

  if (row === undefined) {
    throw new Error("insertInvoice: insert returned no row");
  }

  return row;
}

export async function findInvoiceById(
  ctx: TenantCtx,
  invoiceId: InvoiceId,
): Promise<InvoiceRow | null> {
  const rows = await ctx.db
    .select()
    .from(invoice)
    .where(scopedWhere(ctx, invoice, eq(invoice.id, invoiceId), isNull(invoice.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateInvoiceStatus(
  ctx: TenantCtx,
  invoiceId: InvoiceId,
  status: InvoiceStatus,
): Promise<InvoiceRow | null> {
  const [row] = await ctx.db
    .update(invoice)
    .set({ status })
    .where(scopedWhere(ctx, invoice, eq(invoice.id, invoiceId), isNull(invoice.deletedAt)))
    .returning();

  return row ?? null;
}

/**
 * Newest-first keyset page. Fetches `limit + 1` to detect a following page.
 */
export async function listInvoices(
  ctx: TenantCtx,
  query: ListInvoicesQuery,
): Promise<InvoiceRow[]> {
  const conditions: SQL[] = [scopedWhere(ctx, invoice), isNull(invoice.deletedAt)];

  if (query.cursor !== undefined) {
    const cursorPredicate = or(
      lt(invoice.createdAt, query.cursor.createdAt),
      and(eq(invoice.createdAt, query.cursor.createdAt), lt(invoice.id, query.cursor.id)),
    );
    if (cursorPredicate !== undefined) {
      conditions.push(cursorPredicate);
    }
  }

  return ctx.db
    .select()
    .from(invoice)
    .where(and(...conditions))
    .orderBy(desc(invoice.createdAt), desc(invoice.id))
    .limit(query.limit + 1);
}
