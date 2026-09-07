/**
 * The closed permission registry — the single source of truth for RBAC.
 *
 * Every grant in the product is written here once, as `resource:action`. Both
 * consumers derive from this file rather than restating it:
 *
 * - `@repo/authz` checks `Actor.permissions` against it (`can`).
 * - `@repo/auth` groups it into the nested shape Better Auth's access-control
 *   plugin expects (`toStatements`).
 *
 * The package sits in layer 0 for exactly that reason. `@repo/auth` and
 * `@repo/authz` are both layer 1 and may not import one another, so anything
 * they share has to live below them — before this package existed, "share" meant
 * three hand-synchronised copies of the same list.
 *
 * Adding a permission is one line here plus a grant in `./roles.ts`; the tests
 * fail until the owner role covers it.
 */

/**
 * Resources Better Auth's organization plugin already governs.
 *
 * Their actions are registered here so `can()` sees one complete registry, but
 * `toStatements` filters them out: Better Auth supplies them through
 * `defaultStatements` and the built-in `ownerAc`/`adminAc`/`memberAc` roles, and
 * redeclaring them would fork the plugin's own semantics.
 *
 * `roles.test.ts` asserts the grants here still match what those built-in roles
 * allow, so the two halves cannot drift apart silently.
 */
export const BUILT_IN_RESOURCES = ["organization", "member", "invitation"] as const;

export type BuiltInResource = (typeof BUILT_IN_RESOURCES)[number];

export const PERMISSIONS = {
  // --- Better Auth organization plugin (see BUILT_IN_RESOURCES) --------------
  "organization:update": "organization:update",
  "organization:delete": "organization:delete",
  "member:create": "member:create",
  "member:update": "member:update",
  "member:delete": "member:delete",
  "invitation:create": "invitation:create",
  "invitation:cancel": "invitation:cancel",

  // --- Product --------------------------------------------------------------
  "invoice:create": "invoice:create",
  "invoice:read": "invoice:read",
  "invoice:update": "invoice:update",
  "invoice:void": "invoice:void",
  "invoice:export": "invoice:export",
  "billing:read": "billing:read",
  "billing:manage": "billing:manage",
  "asset:create": "asset:create",
  "asset:read": "asset:read",
} as const;

/** Every registered grant, as a closed union rather than any `${string}:${string}`. */
export type Action = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_ACTIONS: readonly Action[] = Object.values(PERMISSIONS);

/**
 * Actions barred while a support session is impersonating (07 §2).
 *
 * Impersonation exists to reproduce what a user sees, not to act as them, so the
 * destructive and credential-granting paths stay closed even for an owner.
 */
export const DESTRUCTIVE_WHILE_IMPERSONATING: ReadonlySet<Action> = new Set([
  PERMISSIONS["organization:delete"],
  PERMISSIONS["member:delete"],
]);

/** `"invoice:void"` → `"invoice"`. */
export function resourceOf(action: Action): string {
  return action.slice(0, action.indexOf(":"));
}

/** `"invoice:void"` → `"void"`. */
export function actionOf(action: Action): string {
  return action.slice(action.indexOf(":") + 1);
}

function isBuiltIn(resource: string): resource is BuiltInResource {
  return (BUILT_IN_RESOURCES as readonly string[]).includes(resource);
}

/**
 * Group flat grants into Better Auth's `{ resource: [action, …] }` statements.
 *
 * Better Auth needs the nested shape; we want one flat list to read and grep.
 * Deriving one from the other keeps `resource:action` the thing a human edits.
 *
 * Pass `includeBuiltIn: true` to get every resource — used by the test that
 * cross-checks our built-in grants against the plugin's own roles.
 */
export function toStatements(
  actions: readonly Action[],
  options: { includeBuiltIn?: boolean } = {},
): Record<string, string[]> {
  const statements: Record<string, string[]> = {};

  for (const action of actions) {
    const resource = resourceOf(action);
    if (options.includeBuiltIn !== true && isBuiltIn(resource)) {
      continue;
    }

    const verbs = statements[resource] ?? [];
    verbs.push(actionOf(action));
    statements[resource] = verbs;
  }

  return statements;
}

/** Product resources only — what `toStatements` will emit for the full registry. */
export function productResources(): readonly string[] {
  return [...new Set(ALL_ACTIONS.map(resourceOf).filter((r) => !isBuiltIn(r)))];
}
