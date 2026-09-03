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

import { orgProcedure } from "../procedures.ts";

const checkoutInputSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.url(),
  cancelUrl: z.url(),
});

const portalInputSchema = z.object({
  returnUrl: z.url(),
});

export const billingRouter = {
  create: orgProcedure
    .input(createInvoiceInputSchema)
    .output(invoiceSchema)
    .handler(({ context, input }) => createInvoice(context.serviceCtx, input)),

  get: orgProcedure
    .input(getInvoiceInputSchema)
    .output(invoiceSchema)
    .handler(({ context, input }) => getInvoice(context.serviceCtx, input)),

  list: orgProcedure
    .input(listInvoicesInputSchema)
    .output(listInvoicesOutputSchema)
    .handler(({ context, input }) => listInvoicesForOrg(context.serviceCtx, input)),

  void: orgProcedure
    .input(voidInvoiceInputSchema)
    .output(invoiceSchema)
    .handler(({ context, input }) => voidInvoice(context.serviceCtx, input)),

  catalog: orgProcedure.handler(({ context }) => listBillingCatalog(context.serviceCtx)),

  syncCatalog: orgProcedure.handler(({ context }) => syncBillingCatalog(context.serviceCtx)),

  subscription: orgProcedure.handler(({ context }) =>
    getOrganizationSubscription(context.serviceCtx),
  ),

  checkout: orgProcedure
    .input(checkoutInputSchema)
    .handler(({ context, input }) => startCheckout(context.serviceCtx, input)),

  portal: orgProcedure
    .input(portalInputSchema)
    .handler(({ context, input }) => openBillingPortal(context.serviceCtx, input)),
};
