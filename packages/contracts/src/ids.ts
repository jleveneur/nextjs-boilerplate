/**
 * Branded identifier schemas.
 *
 * Construction of a branded id belongs at a trust boundary — a parsed path
 * param, a validated body field. These schemas are that boundary: a plain
 * string becomes an `OrganizationId` only after it proves it is a UUIDv7.
 */

import type {
  AssetId,
  InvitationId,
  InvoiceId,
  MemberId,
  OrganizationId,
  OutboxId,
  SessionId,
  UserId,
} from "@repo/types";
import { isUuidV7 } from "@repo/utils";
import { z } from "zod";

/**
 * A UUIDv7 string, branded as `T`.
 *
 * The assertion after the refine is the brand constructor — same role as
 * `defineErrorCode` in `@repo/errors`. Runtime validation is the refine; the
 * cast only reconnects the type.
 */
function uuidV7Id<T extends string>() {
  return z
    .string()
    .refine(isUuidV7, { message: "must be a UUIDv7" })
    .transform((value): T => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return value as T;
    });
}

export const organizationIdSchema = uuidV7Id<OrganizationId>();
export const userIdSchema = uuidV7Id<UserId>();
export const memberIdSchema = uuidV7Id<MemberId>();
export const sessionIdSchema = uuidV7Id<SessionId>();
export const invitationIdSchema = uuidV7Id<InvitationId>();
export const assetIdSchema = uuidV7Id<AssetId>();
export const outboxIdSchema = uuidV7Id<OutboxId>();
export const invoiceIdSchema = uuidV7Id<InvoiceId>();

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asOrganizationId(id: string): OrganizationId {
  return organizationIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asUserId(id: string): UserId {
  return userIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asMemberId(id: string): MemberId {
  return memberIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asSessionId(id: string): SessionId {
  return sessionIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asInvitationId(id: string): InvitationId {
  return invitationIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asAssetId(id: string): AssetId {
  return assetIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asOutboxId(id: string): OutboxId {
  return outboxIdSchema.parse(id);
}

/** Validate and brand a UUIDv7 at a trust boundary. */
export function asInvoiceId(id: string): InvoiceId {
  return invoiceIdSchema.parse(id);
}
