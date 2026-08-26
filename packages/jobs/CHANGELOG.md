# @repo/jobs

## 0.4.0

### Minor Changes

- 14f480c: Upgrade BullMQ to 6.2.2 and ioredis to 6.0.0 together.

  BullMQ pinned `ioredis@5.11.1` as a hard dependency until v6, where it became
  an optional peer — so ioredis 6 could not be adopted without it. The `JobQueue`
  port is unchanged and no call sites moved; v6's removed APIs (legacy repeatable
  jobs, `Queue#client`, `debounce`) were already unused. Queues stay on the Redis
  backend. See ADR-0010.

## 0.3.0

### Minor Changes

- 4b216be: Expose shared production port factories for application composition roots.

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
- 8528398: Surface dead-letter enqueue and notification failures to worker composition roots.

## 0.2.0

### Minor Changes

- 268f531: Phase 17: Stripe Billing via `@repo/payments` (checkout, portal, webhooks, entitlements), billing permissions/jobs, and `@repo/ui` chart/editor/table exports. Trigger.dev path removed (BullMQ-only, ADR-0009).

## 0.1.0

### Minor Changes

- 9e12442: Add OpenTelemetry with explicit HTTP/undici/ioredis/runtime instrumentations, Sentry scrubbing, trace propagation helpers, logger correlation via `getTraceContext`, and BullMQ queue metrics for Prometheus/Grafana.
