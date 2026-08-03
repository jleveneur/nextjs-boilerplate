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
import {
  createInvoice,
  getInvoice,
  getOrganizationSubscription,
  listBillingCatalog,
  listInvoicesForOrg,
  openBillingPortal,
  startCheckout,
  syncBillingCatalog,
  voidInvoice,
} from "@repo/core";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "../trpc.ts";

const checkoutInputSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.url(),
  cancelUrl: z.url(),
});

const portalInputSchema = z.object({
  returnUrl: z.url(),
});

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

  catalog: orgProcedure.query(({ ctx }) => listBillingCatalog(ctx.serviceCtx)),

  syncCatalog: orgProcedure.mutation(({ ctx }) => syncBillingCatalog(ctx.serviceCtx)),

  subscription: orgProcedure.query(({ ctx }) => getOrganizationSubscription(ctx.serviceCtx)),

  checkout: orgProcedure
    .input(checkoutInputSchema)
    .mutation(({ ctx, input }) => startCheckout(ctx.serviceCtx, input)),

  portal: orgProcedure
    .input(portalInputSchema)
    .mutation(({ ctx, input }) => openBillingPortal(ctx.serviceCtx, input)),
});
