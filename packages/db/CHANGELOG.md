# @repo/db

## 0.3.0

### Minor Changes

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

## 0.2.3

### Patch Changes

- Updated dependencies [3dd67e6]
  - @repo/env@0.3.0

## 0.2.2

### Patch Changes

- b526fa4: Stop re-exporting the Drizzle schema from the `@repo/db` root barrel. Import tables from `@repo/db/schema`.
- Updated dependencies [e120a37]
  - @repo/env@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [7afd252]
  - @repo/env@0.1.0

## 0.2.0

### Minor Changes

- 01ca755: Resolve invoice notification recipients from active organization owners.

### Patch Changes

- 3bda24c: Write transactional audit log entries when invoices are voided.
- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
- 0bbf3ff: Correct package documentation to describe current behaviour: `createEnv` is a server-side `process.env` fallback rather than the repository's sole reader, and the audit-log table has no application writers wired yet.
- Updated dependencies [771731a]
- Updated dependencies [0bbf3ff]
  - @repo/env@0.0.3

## 0.1.0

### Minor Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

### Patch Changes

- Updated dependencies [268f531]
  - @repo/env@0.0.2

## 0.0.1

### Patch Changes

- Updated dependencies [33d9c53]
  - @repo/env@0.0.1
