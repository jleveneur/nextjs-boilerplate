import type { DomainEvent } from "../ports/event-bus.ts";

export const ASSET_CONFIRMED = "asset.confirmed" as const;

export type AssetConfirmedPayload = {
  assetId: string;
  organizationId: string;
  /** Outbox row id — used as the job idempotency key / BullMQ jobId. */
  outboxId: string;
};

export type AssetConfirmedEvent = DomainEvent<typeof ASSET_CONFIRMED, AssetConfirmedPayload>;

export function assetConfirmedEvent(
  payload: AssetConfirmedPayload,
  occurredAt: Date,
): AssetConfirmedEvent {
  return { type: ASSET_CONFIRMED, payload, occurredAt };
}
