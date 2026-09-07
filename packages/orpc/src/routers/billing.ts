/**
 * Billing transport — thin wrappers over `@repo/billing` and
 * `@repo/subscription` services.
 */

import { z } from "zod";

import { createInvoice, getInvoice, listInvoicesForOrg, voidInvoice } from "@repo/billing";
import {
  createInvoiceInputSchema,
  getInvoiceInputSchema,
  invoiceSchema,
  listInvoicesInputSchema,
  listInvoicesOutputSchema,
  voidInvoiceInputSchema,
} from "@repo/contracts";
import {
  getOrganizationSubscription,
  listBillingCatalog,
  openBillingPortal,
  startCheckout,
  syncBillingCatalog,
} from "@repo/subscription";

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
    // Declared inline with plain literals on purpose. Passing this map through a
    // variable, or building the enum from `BILLING_ERROR_CODES`, widens the
    // schema and `data.appCode` infers as `unknown` — the contract compiles and
    // buys nothing. `billing.test.ts` asserts these literals still match the
    // domain codes, so the duplication cannot drift.
    .errors({
      CONFLICT: {
        data: z.object({
          appCode: z.enum(["INVOICE_ALREADY_PAID", "INVOICE_ALREADY_VOID"]),
        }),
      },
    })
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
