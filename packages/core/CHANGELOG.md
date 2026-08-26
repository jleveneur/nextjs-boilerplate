# @repo/core

## 0.2.1

### Patch Changes

- Updated dependencies [14f480c]
  - @repo/jobs@0.4.0

## 0.2.0

### Minor Changes

- 4b216be: Expose shared production port factories for application composition roots.
- 94ada83: Add an application service that derives asset image variants, manages storage
  and asset status transitions, and exposes a typed missing-input error for worker
  transports.
- 01ca755: Resolve invoice notification recipients from active organization owners.

### Patch Changes

- 3bda24c: Write transactional audit log entries when invoices are voided.
- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
- 9d1d923: Authorize `invoice:void` before reading the invoice, so an unauthorized caller cannot probe invoice existence.
- Updated dependencies [ac4c688]
- Updated dependencies [3bda24c]
- Updated dependencies [771731a]
- Updated dependencies [0bbf3ff]
- Updated dependencies [8528398]
- Updated dependencies [4b216be]
- Updated dependencies [01ca755]
  - @repo/contracts@0.1.0
  - @repo/db@0.2.0
  - @repo/authz@0.1.1
  - @repo/jobs@0.3.0
  - @repo/logger@0.0.1
  - @repo/storage@0.0.1

## 0.1.0

### Minor Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

### Patch Changes

- Updated dependencies [268f531]
  - @repo/authz@0.1.0
  - @repo/jobs@0.2.0
  - @repo/db@0.1.0

## 0.0.2

### Patch Changes

- 9e12442: Add typed product analytics and feature-flag packages with PostHog adapters, env providers, domain-event subscription wiring, RSC flag bootstrap, and auth signup analytics hooks.
- Updated dependencies [9e12442]
  - @repo/jobs@0.1.0

## 0.0.1

### Patch Changes

- @repo/db@0.0.1
