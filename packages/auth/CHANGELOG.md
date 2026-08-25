# @repo/auth

## 0.1.2

### Patch Changes

- 667cefc: Generate Better Auth record IDs as UUIDv7 values.
- 9df5461: Restrict explicit API-key permissions to the grants allowed by the key's organization role and include asset grants in auth role defaults.
- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.

## 0.1.1

### Patch Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

## 0.1.0

### Minor Changes

- 9e12442: Add typed product analytics and feature-flag packages with PostHog adapters, env providers, domain-event subscription wiring, RSC flag bootstrap, and auth signup analytics hooks.
