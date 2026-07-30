/**
 * Closed permission registry.
 *
 * Adding an action here without updating role grants and the matrix test fails
 * the suite — that is intentional (deny-by-default + coverage assertion).
 */

export const PERMISSIONS = {
  "organization:update": "organization:update",
  "organization:delete": "organization:delete",
  "member:create": "member:create",
  "member:update": "member:update",
  "member:delete": "member:delete",
  "invitation:create": "invitation:create",
  "invitation:cancel": "invitation:cancel",
  "invoice:create": "invoice:create",
  "invoice:read": "invoice:read",
  "invoice:update": "invoice:update",
  "invoice:void": "invoice:void",
  "invoice:export": "invoice:export",
  "apiKey:create": "apiKey:create",
  "apiKey:revoke": "apiKey:revoke",
  "apiKey:list": "apiKey:list",
} as const;

export type Action = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_ACTIONS: readonly Action[] = Object.values(PERMISSIONS);

/** Actions barred while a support session is impersonating (07 §2). */
export const DESTRUCTIVE_WHILE_IMPERSONATING: ReadonlySet<Action> = new Set([
  PERMISSIONS["organization:delete"],
  PERMISSIONS["apiKey:revoke"],
  PERMISSIONS["apiKey:create"],
  PERMISSIONS["member:delete"],
]);
