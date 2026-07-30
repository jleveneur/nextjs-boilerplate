/**
 * Billing application services.
 *
 * Authorize → load → decide → persist (+ outbox) → emit.
 */

import { authorize, PERMISSIONS } from "@repo/authz";
import {
  createdAtIdCursorSchema,
  parseCursorPayload,
  type CreateInvoiceInput,
  type GetInvoiceInput,
  type Invoice,
  type ListInvoicesInput,
  type ListInvoicesOutput,
  type VoidInvoiceInput,
} from "@repo/contracts";
import { withTransaction, type TenantCtx } from "@repo/db";
import { NotFoundError, ValidationError } from "@repo/errors";
import type { OrganizationId } from "@repo/types";
import { encodeCursor } from "@repo/utils";

import type { Ctx } from "../ctx.ts";
import { writeOutboxEvent } from "../outbox/write-outbox-event.ts";
import { invoiceVoidedEvent, INVOICE_VOIDED } from "./billing.events.ts";
import { toInvoiceDto } from "./billing.mapper.ts";
import { assertCanVoidInvoice } from "./billing.policy.ts";
import {
  findInvoiceById,
  insertInvoice,
  listInvoices,
  updateInvoiceStatus,
} from "./billing.repository.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as OrganizationId;
}

function tenantCtx(ctx: Ctx): TenantCtx {
  return {
    organizationId: ctx.actor.organizationId,
    db: ctx.tx ?? ctx.db,
  };
}

export async function createInvoice(ctx: Ctx, input: CreateInvoiceInput): Promise<Invoice> {
  authorize(ctx.actor, PERMISSIONS["invoice:create"], {
    organizationId: ctx.actor.organizationId,
  });

  const id = ctx.ports.ids.invoiceId();
  const row = await insertInvoice(tenantCtx(ctx), {
    id,
    number: input.number,
    status: input.status,
    amountMinor: input.amountMinor,
    currency: input.currency,
  });

  return toInvoiceDto(row);
}

export async function getInvoice(ctx: Ctx, input: GetInvoiceInput): Promise<Invoice> {
  authorize(ctx.actor, PERMISSIONS["invoice:read"], {
    organizationId: ctx.actor.organizationId,
  });

  const row = await findInvoiceById(tenantCtx(ctx), input.invoiceId);
  if (row === null) {
    throw new NotFoundError({ resource: "invoice", id: input.invoiceId });
  }

  return toInvoiceDto(row);
}

export async function listInvoicesForOrg(
  ctx: Ctx,
  input: ListInvoicesInput,
): Promise<ListInvoicesOutput> {
  authorize(ctx.actor, PERMISSIONS["invoice:read"], {
    organizationId: ctx.actor.organizationId,
  });

  let cursor: { createdAt: Date; id: string } | undefined;
  if (input.cursor !== undefined) {
    const payload = parseCursorPayload(input.cursor, createdAtIdCursorSchema);
    if (payload === undefined) {
      throw new ValidationError({ message: "Invalid pagination cursor" });
    }

    cursor = { createdAt: new Date(payload.createdAt), id: payload.id };
  }

  const rows = await listInvoices(tenantCtx(ctx), {
    limit: input.limit,
    ...(cursor === undefined ? {} : { cursor }),
  });

  const page = rows.slice(0, input.limit);
  const hasMore = rows.length > input.limit;
  const last = page.at(-1);
  const nextCursor =
    hasMore && last !== undefined
      ? encodeCursor({
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  return {
    data: page.map(toInvoiceDto),
    nextCursor,
  };
}

export async function voidInvoice(ctx: Ctx, input: VoidInvoiceInput): Promise<Invoice> {
  return withTransaction(ctx.db, async (tx) => {
    const scoped: Ctx = { ...ctx, tx };
    const tenant = tenantCtx(scoped);

    const existing = await findInvoiceById(tenant, input.invoiceId);
    if (existing === null) {
      throw new NotFoundError({ resource: "invoice", id: input.invoiceId });
    }

    assertCanVoidInvoice(ctx.actor, {
      id: existing.id,
      organizationId: brandOrganizationId(existing.organizationId),
      status: existing.status,
    });

    const updated = await updateInvoiceStatus(tenant, input.invoiceId, "void");
    if (updated === null) {
      throw new NotFoundError({ resource: "invoice", id: input.invoiceId });
    }

    const outboxId = ctx.ports.ids.outboxId();
    const event = invoiceVoidedEvent(
      {
        invoiceId: updated.id,
        organizationId: updated.organizationId,
        amountMinor: updated.amountMinor,
        currency: updated.currency,
        outboxId,
      },
      ctx.ports.clock.now(),
    );

    await writeOutboxEvent({
      db: tx,
      id: outboxId,
      organizationId: ctx.actor.organizationId,
      eventType: INVOICE_VOIDED,
      payload: { ...event.payload },
    });

    // In-request fan-out; durable enqueue is via outbox relay (Phase 10).
    // Tests (and interim composition roots) subscribe to prove the job path.
    await ctx.ports.events.emit(event);

    return toInvoiceDto(updated);
  });
}
