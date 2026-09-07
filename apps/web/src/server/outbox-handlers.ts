// oxlint-disable-next-line import/no-unassigned-import -- composition root, server only
import "server-only";

import { z } from "zod";

import { ASSET_CONFIRMED, AssetDerivationInputMissingError } from "@repo/assets";
import { deriveAssetVariants } from "@repo/assets/derive";
import { INVOICE_VOIDED, resolveInvoiceVoidedRecipientEmail } from "@repo/billing";
import { asAssetId, asOrganizationId } from "@repo/contracts";
import { systemActorForOrganization, type Ctx, type OutboxHandlers } from "@repo/kernel";
import type { OutboxId } from "@repo/types";

import { getContainer } from "./container.ts";

/**
 * Outbox event handlers, wired here because the relay must not import a slice.
 *
 * Payloads are re-validated with Zod rather than trusted: an outbox row is
 * `jsonb` written by an older deploy of this code, which makes it external
 * input by the time it is read back.
 */

const invoiceVoidedPayload = z.object({
  invoiceId: z.string().min(1),
  organizationId: z.uuid(),
  amountMinor: z.number().int(),
});

const assetConfirmedPayload = z.object({
  assetId: z.uuid(),
  organizationId: z.uuid(),
});

const SIDE_EFFECT_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Claim a row's side effect before performing it.
 *
 * The relay marks a row published in the same transaction that claimed it, so
 * a row is normally delivered once. It is redelivered when a handler throws
 * *after* its side effect landed — a sent email that failed on the way back.
 * This guard is what keeps that retry from sending a second copy.
 */
async function claimSideEffect(outboxId: OutboxId): Promise<boolean> {
  return getContainer().cache.setIfAbsent(
    {
      namespace: "outbox-side-effect",
      version: 1,
      key: outboxId,
      ttlSeconds: SIDE_EFFECT_TTL_SECONDS,
    },
    true,
  );
}

function systemCtx(organizationId: string): Ctx {
  const container = getContainer();
  return {
    actor: systemActorForOrganization(asOrganizationId(organizationId)),
    db: container.db,
    logger: container.logger,
    ports: container.ports,
  };
}

export const outboxHandlers: OutboxHandlers = {
  [INVOICE_VOIDED]: async ({ payload, outboxId }) => {
    const input = invoiceVoidedPayload.parse(payload);
    if (!(await claimSideEffect(outboxId))) {
      return;
    }

    const ctx = systemCtx(input.organizationId);
    const recipientEmail = await resolveInvoiceVoidedRecipientEmail(ctx);
    if (recipientEmail === null) {
      // No owner to notify is a dead end, not a transient fault: log and let
      // the row be marked published rather than retried until it expires.
      ctx.logger.warn(
        { organizationId: input.organizationId, invoiceId: input.invoiceId },
        "no active owner email for invoice voided notification",
      );
      return;
    }

    await getContainer().emailMailer.send({
      to: recipientEmail,
      subject: `Invoice ${input.invoiceId} voided`,
      html: `<p>Invoice ${input.invoiceId} was voided for ${String(input.amountMinor)} minor units.</p>`,
      headers: { "Idempotency-Key": outboxId },
    });
    ctx.logger.info(
      { invoiceId: input.invoiceId, organizationId: input.organizationId, outboxId },
      "invoice.voided notification sent",
    );
  },

  [ASSET_CONFIRMED]: async ({ payload, outboxId }) => {
    const input = assetConfirmedPayload.parse(payload);
    if (!(await claimSideEffect(outboxId))) {
      return;
    }

    const ctx = systemCtx(input.organizationId);
    try {
      await deriveAssetVariants(ctx, { assetId: asAssetId(input.assetId) });
    } catch (error) {
      if (error instanceof AssetDerivationInputMissingError) {
        // The source object is gone; retrying cannot make it reappear.
        ctx.logger.warn(
          { assetId: input.assetId, organizationId: input.organizationId, outboxId },
          error.message,
        );
        return;
      }
      throw error;
    }
  },
};
