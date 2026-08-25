/**
 * Append-only audit log writes.
 */

import type { OrganizationId, UserId } from "@repo/types";

import { auditLog } from "../schema/audit-log.sql.ts";
import type { DbExecutor } from "../with-transaction.ts";

export type AuditLogRow = typeof auditLog.$inferSelect;

export type InsertAuditLogInput = {
  organizationId: OrganizationId;
  actorUserId: UserId | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
};

export async function insertAuditLog(
  db: DbExecutor,
  input: InsertAuditLogInput,
): Promise<AuditLogRow> {
  const [row] = await db.insert(auditLog).values(input).returning();

  if (row === undefined) {
    throw new Error("insertAuditLog: insert returned no row");
  }

  return row;
}
