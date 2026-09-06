# @repo/permissions

## 0.1.0

### Minor Changes

- 26b826e: Move the RBAC registry into a new layer-0 package, `@repo/permissions`, and derive
  Better Auth's statements from it instead of restating them.

  Permissions were declared three times: the registry and role grants in `@repo/authz`,
  a second role map in `@repo/auth/role-permissions.ts`, and a third hand-written
  statement map in `@repo/auth/access-control.ts`. Both packages are layer 1 and may
  not import each other, so "share" meant "copy" — and the copies had already drifted:
  `asset:create` and `asset:read` were enforced for sessions and unknown to API keys.

  `resource:action` is now the only shape anyone edits. `toStatements` groups it into
  the nested form Better Auth needs, and tests assert the derived statements cover the
  registry and still agree with the plugin's built-in role grants.

  Breaking for consumers: `permissionsForOrganizationRole` is now `permissionsForRole`,
  exported from `@repo/permissions` and re-exported by `@repo/auth` and `@repo/authz`.

  Neither `@repo/auth` nor `@repo/authz` republishes the registry. A package exports
  what it owns; `PERMISSIONS`, `ROLE_PERMISSIONS`, and `permissionsForRole` come from
  `@repo/permissions` directly. `@repo/authz` still re-exports `type Action`, because
  that is the parameter type of its own `can`.
