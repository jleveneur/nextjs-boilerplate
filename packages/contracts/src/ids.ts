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
