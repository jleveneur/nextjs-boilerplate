import { asOrganizationId, asUserId } from "@repo/contracts";
import type { Ctx } from "@repo/core";
import type { Mailer as EmailMailer } from "@repo/email";
import type { JobHandler } from "@repo/jobs";
import type { Actor, OrganizationId } from "@repo/types";
import type { Redis } from "ioredis";

import { claimJobIdempotency } from "../idempotency.ts";

function systemActor(organizationId: OrganizationId): Actor {
  return {
    userId: asUserId("01900000-0000-7000-8000-000000000000"),
    organizationId,
    role: "owner",
    permissions: [],
    isSystem: true,
  };
}

export function createInvoiceVoidedNotifyHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
  mailer: EmailMailer;
  idempotencyRedis: Redis;
}): JobHandler<"invoice.voided.notify"> {
  return async (payload) => {
    const claimed = await claimJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (!claimed) {
      return;
    }

    const ctx = options.buildCtx(systemActor(asOrganizationId(payload.organizationId)));
    // Notify path: durable side effect is an email keyed on the outbox id.
    // Recipient is the org's operational inbox placeholder until product wiring.
    await options.mailer.send({
      to: "billing-notify@example.com",
      subject: `Invoice ${payload.invoiceId} voided`,
      html: `<p>Invoice ${payload.invoiceId} was voided for ${String(payload.amountMinor)} minor units.</p>`,
      headers: { "Idempotency-Key": payload.idempotencyKey },
    });
    ctx.logger.info(
      {
        invoiceId: payload.invoiceId,
        organizationId: payload.organizationId,
        idempotencyKey: payload.idempotencyKey,
      },
      "invoice.voided.notify completed",
    );
  };
}
