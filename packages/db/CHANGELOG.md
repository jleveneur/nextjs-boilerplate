# @repo/db

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
