/**
 * Invoice wire contracts for the billing vertical slice.
 *
 * Snake_case appears only on the public REST surface (Phase 9). oRPC and jobs
 * use these camelCase shapes.
 */

import { z } from "zod";

import { invoiceIdSchema, organizationIdSchema } from "./ids.ts";
import { currencyCodeSchema } from "./money.ts";
import { paginatedResponseSchema, paginationQuerySchema } from "./pagination.ts";
import { timestampsSchema } from "./timestamp.ts";

export const invoiceStatusSchema = z.enum(["draft", "open", "paid", "void"]);

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceSchema = z
  .object({
    id: invoiceIdSchema,
    organizationId: organizationIdSchema,
    number: z.string().min(1).max(64),
    status: invoiceStatusSchema,
    amountMinor: z.number().int(),
    currency: currencyCodeSchema,
  })
  .extend(timestampsSchema.shape);

export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceInputSchema = z.object({
  number: z.string().min(1).max(64),
  amountMinor: z.number().int().positive(),
  currency: currencyCodeSchema.default("USD"),
  status: z.enum(["draft", "open"]).default("draft"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export const getInvoiceInputSchema = z.object({
  invoiceId: invoiceIdSchema,
});

export type GetInvoiceInput = z.infer<typeof getInvoiceInputSchema>;

export const listInvoicesInputSchema = paginationQuerySchema;

export type ListInvoicesInput = z.infer<typeof listInvoicesInputSchema>;

export const listInvoicesOutputSchema = paginatedResponseSchema(invoiceSchema);

export type ListInvoicesOutput = z.infer<typeof listInvoicesOutputSchema>;

export const voidInvoiceInputSchema = z.object({
  invoiceId: invoiceIdSchema,
});

export type VoidInvoiceInput = z.infer<typeof voidInvoiceInputSchema>;
