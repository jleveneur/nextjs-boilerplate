/**
 * Auth-layer audit events. Composition roots map these into `@repo/kernel`
 * `recordAuditLog` — this package is layer 1 and must not import the kernel or db.
 */

export type AuthAuditEvent = {
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
};

export type OnAuditEvent = (event: AuthAuditEvent) => Promise<void>;

export async function emitAuthAudit(
  onAuditEvent: OnAuditEvent | undefined,
  event: AuthAuditEvent,
): Promise<void> {
  if (onAuditEvent === undefined) {
    return;
  }
  await onAuditEvent(event);
}
