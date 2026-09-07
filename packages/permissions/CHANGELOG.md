# @repo/permissions

## 1.0.0

### Major Changes

- 853dfef: Split `@repo/core` into a kernel plus one package per domain slice.

  `@repo/core` is removed. Its shared surface — request context, side-effect
  ports, the audit log, and the transactional outbox — is now `@repo/kernel`
  (layer 2), and each domain slice is its own layer-3 package: `@repo/billing`,
  `@repo/subscription`, and `@repo/assets`.

  Transport moves to layer 4 and apps to layer 5 to open layer 3. The layer rule
  is unchanged: strictly-lower-layer imports only, with no new exception.

  Also in this release: the job queue is gone (no `CtxPorts.jobs`, no
  `@repo/jobs`); the outbox relay dispatches to a handler registry supplied by
  the composition root; the API-key feature is removed from `@repo/auth` and
  `@repo/permissions`; `@repo/contracts` drops the `invoice-rest` schemas that only the deleted REST
  transport used; and `@repo/db` gains `pingDatabase`.

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
