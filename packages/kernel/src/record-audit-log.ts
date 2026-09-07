/**
 * Record an audit row when the writer is not already in a {@link Ctx}.
 *
 * Auth composition roots use this: `@repo/auth` cannot import `@repo/core`,
 * so the edge maps `AuthAuditEvent` through here after validating ids.
 */

import { organizationIdSchema, userIdSchema } from "@repo/contracts";
import { insertAuditLog, type Database } from "@repo/db";

export type RecordAuditLogInput = {
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
};

export async function recordAuditLog(db: Database, input: RecordAuditLogInput): Promise<void> {
  await insertAuditLog(db, {
    organizationId: organizationIdSchema.parse(input.organizationId),
    actorUserId: input.actorUserId === null ? null : userIdSchema.parse(input.actorUserId),
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
  });
}
