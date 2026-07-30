/**
 * Entity identifiers.
 *
 * Every identifier is branded, so passing an organisation's ID where a user's is
 * expected is a compile error rather than a silent cross-tenant read. This is the
 * cheapest available defence against the single most damaging class of bug in a
 * multi-tenant system, and it costs nothing at runtime.
 *
 * Declared here rather than next to each entity so that layer 0 owns the
 * vocabulary and nothing needs to depend on the database package to name a thing.
 * Construction and validation live in `@repo/utils`; this file is types only.
 */

import type { Brand } from "./brand.ts";

/** Tenant boundary. Almost every query is scoped by one of these. */
export type OrganizationId = Brand<string, "OrganizationId">;

/** A person. Distinct from `MemberId`: one user belongs to many organisations. */
export type UserId = Brand<string, "UserId">;

/** A user's membership of one organisation, and where their role is recorded. */
export type MemberId = Brand<string, "MemberId">;

/** An authenticated session. */
export type SessionId = Brand<string, "SessionId">;

/** A pending invitation to join an organisation. */
export type InvitationId = Brand<string, "InvitationId">;

/** A stored file. The ID is not the storage key — see `@repo/storage`. */
export type AssetId = Brand<string, "AssetId">;

/** A tenant-scoped invoice (billing vertical slice). */
export type InvoiceId = Brand<string, "InvoiceId">;

/** An audit log entry. */
export type AuditLogId = Brand<string, "AuditLogId">;

/** A queued side effect awaiting dispatch. See the outbox pattern in ADR-0007. */
export type OutboxId = Brand<string, "OutboxId">;

/**
 * Correlates every log line, span, and error for one logical operation. Assigned
 * at the edge and propagated, so "what else happened during this request" is a
 * lookup rather than an investigation.
 */
export type RequestId = Brand<string, "RequestId">;

/**
 * A client-supplied key that makes a mutation safe to retry. Two requests with
 * the same key must produce one effect.
 */
export type IdempotencyKey = Brand<string, "IdempotencyKey">;
