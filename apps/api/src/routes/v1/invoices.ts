import type { OpenAPIHono } from "@hono/zod-openapi";
import { fromCreateInvoiceRest, toInvoiceRest, toInvoiceRestPage } from "@repo/contracts";
import { createInvoice, getInvoice, listInvoicesForOrg, voidInvoice } from "@repo/core";
import { ForbiddenError } from "@repo/errors";
import type { InvoiceId, OrganizationId } from "@repo/types";

import type { ApiEnv } from "../../app.ts";
import {
  createInvoiceRoute,
  getInvoiceRoute,
  listInvoicesRoute,
  voidInvoiceRoute,
} from "./invoice-routes.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- path param brand
  return id as OrganizationId;
}

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- path param brand
  return id as InvoiceId;
}

function assertPathOrg(actorOrgId: OrganizationId, pathOrgId: string): void {
  if (actorOrgId !== brandOrganizationId(pathOrgId)) {
    throw new ForbiddenError({
      message: "organization_id does not match the API key organization",
    });
  }
}

export function registerInvoiceRoutes(app: OpenAPIHono<ApiEnv>): void {
  app.openapi(listInvoicesRoute, async (c) => {
    const { organization_id } = c.req.valid("param");
    const query = c.req.valid("query");
    const ctx = c.get("ctx");
    assertPathOrg(ctx.actor.organizationId, organization_id);
    const page = await listInvoicesForOrg(ctx, query);
    return c.json(toInvoiceRestPage(page), 200);
  });

  app.openapi(getInvoiceRoute, async (c) => {
    const { organization_id, invoice_id } = c.req.valid("param");
    const ctx = c.get("ctx");
    assertPathOrg(ctx.actor.organizationId, organization_id);
    const invoice = await getInvoice(ctx, { invoiceId: brandInvoiceId(invoice_id) });
    return c.json(toInvoiceRest(invoice), 200);
  });

  app.openapi(createInvoiceRoute, async (c) => {
    const { organization_id } = c.req.valid("param");
    const body = c.req.valid("json");
    const ctx = c.get("ctx");
    assertPathOrg(ctx.actor.organizationId, organization_id);
    const invoice = await createInvoice(ctx, fromCreateInvoiceRest(body));
    return c.json(toInvoiceRest(invoice), 201);
  });

  app.openapi(voidInvoiceRoute, async (c) => {
    const { organization_id, invoice_id } = c.req.valid("param");
    const ctx = c.get("ctx");
    assertPathOrg(ctx.actor.organizationId, organization_id);
    const invoice = await voidInvoice(ctx, { invoiceId: brandInvoiceId(invoice_id) });
    return c.json(toInvoiceRest(invoice), 200);
  });
}
