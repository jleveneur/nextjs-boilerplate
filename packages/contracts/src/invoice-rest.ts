/**
 * Snake_case invoice wire shapes for the public REST API.
 *
 * oRPC and core keep camelCase ({@link invoiceSchema}); this module is the only
 * place casing changes for invoices.
 */

import { z } from "zod";

import { invoiceIdSchema, organizationIdSchema } from "./ids.ts";
import type { CreateInvoiceInput, Invoice } from "./invoice.ts";
import { invoiceStatusSchema } from "./invoice.ts";
import { currencyCodeSchema } from "./money.ts";
import { paginatedResponseRestSchema } from "./pagination.ts";
import { timestampSchema } from "./timestamp.ts";

export const invoiceRestSchema = z.object({
  id: invoiceIdSchema,
  organization_id: organizationIdSchema,
  number: z.string().min(1).max(64),
  status: invoiceStatusSchema,
  amount_minor: z.number().int(),
  currency: currencyCodeSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.nullable().optional(),
});

export type InvoiceRest = z.infer<typeof invoiceRestSchema>;

export const createInvoiceRestInputSchema = z.object({
  number: z.string().min(1).max(64),
  amount_minor: z.number().int().positive(),
  currency: currencyCodeSchema.default("USD"),
  status: z.enum(["draft", "open"]).default("draft"),
});

export type CreateInvoiceRestInput = z.infer<typeof createInvoiceRestInputSchema>;

export const listInvoicesRestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export const listInvoicesRestResponseSchema = paginatedResponseRestSchema(invoiceRestSchema);

export function toInvoiceRest(invoice: Invoice): InvoiceRest {
  return {
    id: invoice.id,
    organization_id: invoice.organizationId,
    number: invoice.number,
    status: invoice.status,
    amount_minor: invoice.amountMinor,
    currency: invoice.currency,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
    ...(invoice.deletedAt === undefined ? {} : { deleted_at: invoice.deletedAt }),
  };
}

export function fromCreateInvoiceRest(input: CreateInvoiceRestInput): CreateInvoiceInput {
  return {
    number: input.number,
    amountMinor: input.amount_minor,
    currency: input.currency,
    status: input.status,
  };
}

export function toInvoiceRestPage(page: {
  data: readonly Invoice[];
  nextCursor: string | null;
}): z.infer<typeof listInvoicesRestResponseSchema> {
  return {
    data: page.data.map(toInvoiceRest),
    next_cursor: page.nextCursor,
  };
}
