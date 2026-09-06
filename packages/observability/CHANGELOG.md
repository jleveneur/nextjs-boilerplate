# @repo/observability

## 0.4.0

### Minor Changes

- 3dd67e6: Add an `ErrorTracker` port with a Sentry adapter in capture-only mode.

  Unexpected errors already reached Pino at three boundaries; nothing grouped them.
  `ErrorTracker` is reported from those same three places, on the same condition, so
  expected domain errors stay out of the incident channel.

  `SENTRY_DSN` is the whole switch — unset selects `createNoopErrorTracker()`, which
  is the supported state for local runs, CI, and self-hosted deployments without a
  tracker. A self-hosted GlitchTip DSN works unchanged.

  The adapter disables Sentry's bundled OpenTelemetry SDK (`skipOpenTelemetrySetup`,
  `defaultIntegrations: false`). `@sentry/node` v8+ initialises its own OTel by
  default, and this package already starts a `NodeSDK`; two SDKs claiming the global
  `TracerProvider` is what broke an earlier attempt. Tracing stays with OTel.

## 0.3.0

### Minor Changes

- e120a37: Remove Sentry from the observability and env packages. Unexpected errors stay in Pino until a tracker is wired again.

## 0.2.0

### Minor Changes

- d03d93a: Tag Sentry events with the service name (`api`, `worker`, `web`) at initialisation so errors across apps can report to a single unified Sentry project.

## 0.1.1

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.

## 0.1.0

### Minor Changes

- 9e12442: Add OpenTelemetry with explicit HTTP/undici/ioredis/runtime instrumentations, Sentry scrubbing, trace propagation helpers, logger correlation via `getTraceContext`, and BullMQ queue metrics for Prometheus/Grafana.
