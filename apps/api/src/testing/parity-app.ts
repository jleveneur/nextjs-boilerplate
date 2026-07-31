/**
 * Hono app for transport parity tests — injects a fixed Actor (no API-key IO).
 *
 * Routes call the same `@repo/core` services as the OpenAPI handlers; OpenAPI
 * validation is out of scope for the ADR-0003 authz assertion.
 */

import { Hono } from "hono";
import { createMemoryCache } from "@repo/cache";
import { toInvoiceRest } from "@repo/contracts";
import { voidInvoice, type Ctx, type CtxPorts } from "@repo/core";
import type { Database } from "@repo/db";
import { ForbiddenError } from "@repo/errors";
import { createLogger, type Logger } from "@repo/logger";
import type { Actor, InvoiceId, OrganizationId } from "@repo/types";
import { Writable } from "node:stream";

import type { ApiEnv } from "../app.ts";
import { errorHandler, requestIdMiddleware } from "../middleware/index.ts";
import type { AppContainer } from "../server/container.ts";

/** Root pool or an open test transaction — both work as the service `db`. */
export type ParityDb = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

function testLogger(): Logger {
  return createLogger({
    service: "api-parity-test",
    env: "test",
    level: "error",
    destination: new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    }),
  });
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test path brand
  return id as OrganizationId;
}

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test path brand
  return id as InvoiceId;
}

export function createParityApp(options: {
  actor: Actor;
  db: ParityDb;
  ports: CtxPorts;
}): Hono<ApiEnv> {
  const logger = testLogger();
  const cache = createMemoryCache("test");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test injects tx as Database
  const db = options.db as Database;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- parity test double
  const container = { db, logger, ports: options.ports, cache } as AppContainer;

  const ctx: Ctx = {
    actor: options.actor,
    db,
    logger,
    ports: options.ports,
  };

  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.set("container", container);
    c.set("actor", options.actor);
    c.set("apiKey", "parity-test-key");
    c.set("ctx", ctx);
    await next();
  });
  app.use("*", requestIdMiddleware);
  app.onError(errorHandler);

  const v1 = new Hono<ApiEnv>();
  v1.post("/organizations/:organization_id/invoices/:invoice_id/void", async (c) => {
    const organizationId = c.req.param("organization_id");
    const invoiceId = c.req.param("invoice_id");
    const serviceCtx = c.get("ctx");
    if (serviceCtx.actor.organizationId !== brandOrganizationId(organizationId)) {
      throw new ForbiddenError({
        message: "organization_id does not match the API key organization",
      });
    }
    const invoice = await voidInvoice(serviceCtx, {
      invoiceId: brandInvoiceId(invoiceId),
    });
    return c.json(toInvoiceRest(invoice), 200);
  });
  app.route("/v1", v1);

  return app;
}
