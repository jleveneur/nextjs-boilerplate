# @repo/env

## 0.0.3

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
- 0bbf3ff: Correct package documentation to describe current behaviour: `createEnv` is a server-side `process.env` fallback rather than the repository's sole reader, and the audit-log table has no application writers wired yet.

## 0.0.2

### Patch Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

## 0.0.1

### Patch Changes

- 33d9c53: Document that `SKIP_ENV_VALIDATION` participates in the Turborepo build hash so Docker image builds and remote cache stay consistent.
