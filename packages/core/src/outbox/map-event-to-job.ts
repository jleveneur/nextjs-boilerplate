/**
 * Maps durable outbox event types to `@repo/jobs` enqueue calls.
 */

import { JOB_NAMES, type JobName, type JobPayload } from "@repo/jobs";

import { ASSET_CONFIRMED } from "../assets/asset.events.ts";
import { INVOICE_VOIDED } from "../billing/billing.events.ts";

export type MappedJob = {
  [N in JobName]: {
    name: N;
    payload: JobPayload<N>;
    jobId: string;
  };
}[JobName];

type InvoiceVoidedOutboxPayload = {
  invoiceId: string;
  organizationId: string;
  amountMinor: number;
  outboxId: string;
};

type AssetConfirmedOutboxPayload = {
  assetId: string;
  organizationId: string;
  outboxId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`outbox payload missing string field "${field}"`);
  }

  return value;
}

function asInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`outbox payload missing int field "${field}"`);
  }

  return value;
}

export function mapOutboxEventToJob(eventType: string, payload: unknown): MappedJob | null {
  if (!isRecord(payload)) {
    throw new Error("outbox payload must be an object");
  }

  switch (eventType) {
    case INVOICE_VOIDED: {
      const typed: InvoiceVoidedOutboxPayload = {
        invoiceId: asString(payload["invoiceId"], "invoiceId"),
        organizationId: asString(payload["organizationId"], "organizationId"),
        amountMinor: asInt(payload["amountMinor"], "amountMinor"),
        outboxId: asString(payload["outboxId"], "outboxId"),
      };
      return {
        name: JOB_NAMES.invoiceVoidedNotify,
        jobId: typed.outboxId,
        payload: {
          invoiceId: typed.invoiceId,
          organizationId: typed.organizationId,
          amountMinor: typed.amountMinor,
          idempotencyKey: typed.outboxId,
        },
      };
    }
    case ASSET_CONFIRMED: {
      const typed: AssetConfirmedOutboxPayload = {
        assetId: asString(payload["assetId"], "assetId"),
        organizationId: asString(payload["organizationId"], "organizationId"),
        outboxId: asString(payload["outboxId"], "outboxId"),
      };
      return {
        name: JOB_NAMES.imageDerive,
        jobId: typed.outboxId,
        payload: {
          assetId: typed.assetId,
          organizationId: typed.organizationId,
          idempotencyKey: typed.outboxId,
        },
      };
    }
    default:
      return null;
  }
}
