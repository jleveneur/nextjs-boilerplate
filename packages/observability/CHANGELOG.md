# @repo/observability

## 0.1.1

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.

## 0.1.0

### Minor Changes

- 9e12442: Add OpenTelemetry with explicit HTTP/undici/ioredis/runtime instrumentations, Sentry scrubbing, trace propagation helpers, logger correlation via `getTraceContext`, and BullMQ queue metrics for Prometheus/Grafana.
