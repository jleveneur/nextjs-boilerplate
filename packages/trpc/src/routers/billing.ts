/**
 * Billing transport — thin wrappers over `@repo/core` services.
 */

import {
  createInvoiceInputSchema,
  getInvoiceInputSchema,
  invoiceSchema,
  listInvoicesInputSchema,
  listInvoicesOutputSchema,
  voidInvoiceInputSchema,
} from "@repo/contracts";
import { createInvoice, getInvoice, listInvoicesForOrg, voidInvoice } from "@repo/core";

import { createTRPCRouter, orgProcedure } from "../trpc.ts";

export const billingRouter = createTRPCRouter({
  create: orgProcedure
    .input(createInvoiceInputSchema)
    .output(invoiceSchema)
    .mutation(({ ctx, input }) => createInvoice(ctx.serviceCtx, input)),

  get: orgProcedure
    .input(getInvoiceInputSchema)
    .output(invoiceSchema)
    .query(({ ctx, input }) => getInvoice(ctx.serviceCtx, input)),

  list: orgProcedure
    .input(listInvoicesInputSchema)
    .output(listInvoicesOutputSchema)
    .query(({ ctx, input }) => listInvoicesForOrg(ctx.serviceCtx, input)),

  void: orgProcedure
    .input(voidInvoiceInputSchema)
    .output(invoiceSchema)
    .mutation(({ ctx, input }) => voidInvoice(ctx.serviceCtx, input)),
});
