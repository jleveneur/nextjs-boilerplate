# @repo/jobs

## 0.2.0

### Minor Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

## 0.1.0

### Minor Changes

- 9e12442: Add OpenTelemetry with explicit HTTP/undici/ioredis/runtime instrumentations, Sentry scrubbing, trace propagation helpers, logger correlation via `getTraceContext`, and BullMQ queue metrics for Prometheus/Grafana.
