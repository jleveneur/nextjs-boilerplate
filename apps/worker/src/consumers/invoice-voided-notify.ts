import {
  resolveInvoiceVoidedRecipientEmail,
  systemActorForOrganization,
  type Ctx,
} from "@repo/core";
import type { Mailer as EmailMailer } from "@repo/email";
import { TerminalJobError, type JobHandler } from "@repo/jobs";
import type { Actor, OrganizationId } from "@repo/types";
import type { Redis } from "ioredis";

import {
  beginJobIdempotency,
  completeJobIdempotency,
  releaseJobIdempotency,
} from "../idempotency.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- job payload brand
  return id as OrganizationId;
}

export function createInvoiceVoidedNotifyHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
  mailer: EmailMailer;
  idempotencyRedis: Redis;
}): JobHandler<"invoice.voided.notify"> {
  return async (payload) => {
    const lease = await beginJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (lease.status === "completed") {
      return;
    }
    if (lease.status === "in_progress") {
      throw new Error("idempotency lease held");
    }

    const organizationId = brandOrganizationId(payload.organizationId);
    const ctx = options.buildCtx(systemActorForOrganization(organizationId));

    try {
      const recipientEmail = await resolveInvoiceVoidedRecipientEmail(ctx);
      if (recipientEmail === null) {
        throw new TerminalJobError(
          `organization ${payload.organizationId} has no active owner email for invoice notification`,
        );
      }

      // Notify path: durable side effect is an email keyed on the outbox id.
      await options.mailer.send({
        to: recipientEmail,
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
      await completeJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
    } catch (error) {
      await releaseJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
      throw error;
    }
  };
}
