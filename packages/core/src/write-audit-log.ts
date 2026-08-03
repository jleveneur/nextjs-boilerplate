/**
 * Write an audit entry after the caller has authorized the mutation.
 *
 * When the service is already in a transaction, the audit row participates in
 * that transaction so it cannot commit independently from the state change.
 */

import { insertAuditLog } from "@repo/db";

import type { Ctx } from "./ctx.ts";

export type WriteAuditLogInput = {
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
};

export async function writeAuditLog(ctx: Ctx, input: WriteAuditLogInput): Promise<void> {
  await insertAuditLog(ctx.tx ?? ctx.db, {
    organizationId: ctx.actor.organizationId,
    actorUserId: ctx.actor.isSystem ? null : ctx.actor.userId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
  });
}
