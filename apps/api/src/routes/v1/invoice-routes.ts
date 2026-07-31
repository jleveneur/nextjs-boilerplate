/**
 * OpenAPI route definitions for invoices (no `@repo/core` — safe for doc gen).
 */

import { createRoute, z } from "@hono/zod-openapi";
import {
  createInvoiceRestInputSchema,
  invoiceRestSchema,
  listInvoicesRestQuerySchema,
  listInvoicesRestResponseSchema,
} from "@repo/contracts";
import { isUuidV7 } from "@repo/utils";

const uuidV7Path = z
  .string()
  .refine(isUuidV7, { message: "must be a UUIDv7" })
  .openapi({ param: { in: "path" } });

export const orgParams = z.object({
  organization_id: uuidV7Path.openapi({
    param: { name: "organization_id", in: "path" },
  }),
});

export const orgInvoiceParams = orgParams.extend({
  invoice_id: uuidV7Path.openapi({
    param: { name: "invoice_id", in: "path" },
  }),
});

export const listInvoicesRoute = createRoute({
  method: "get",
  path: "/organizations/{organization_id}/invoices",
  tags: ["Invoices"],
  request: {
    params: orgParams,
    query: listInvoicesRestQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated invoices",
      content: { "application/json": { schema: listInvoicesRestResponseSchema } },
    },
  },
});

export const getInvoiceRoute = createRoute({
  method: "get",
  path: "/organizations/{organization_id}/invoices/{invoice_id}",
  tags: ["Invoices"],
  request: { params: orgInvoiceParams },
  responses: {
    200: {
      description: "Invoice",
      content: { "application/json": { schema: invoiceRestSchema } },
    },
  },
});

export const createInvoiceRoute = createRoute({
  method: "post",
  path: "/organizations/{organization_id}/invoices",
  tags: ["Invoices"],
  request: {
    params: orgParams,
    body: {
      required: true,
      content: { "application/json": { schema: createInvoiceRestInputSchema } },
    },
  },
  responses: {
    201: {
      description: "Created invoice",
      content: { "application/json": { schema: invoiceRestSchema } },
    },
  },
});

export const voidInvoiceRoute = createRoute({
  method: "post",
  path: "/organizations/{organization_id}/invoices/{invoice_id}/void",
  tags: ["Invoices"],
  request: { params: orgInvoiceParams },
  responses: {
    200: {
      description: "Voided invoice",
      content: { "application/json": { schema: invoiceRestSchema } },
    },
  },
});

export const invoiceOpenApiRoutes = [
  listInvoicesRoute,
  getInvoiceRoute,
  createInvoiceRoute,
  voidInvoiceRoute,
] as const;
