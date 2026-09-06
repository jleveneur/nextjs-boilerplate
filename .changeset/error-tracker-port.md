---
"@repo/observability": minor
"@repo/env": minor
---

Add an `ErrorTracker` port with a Sentry adapter in capture-only mode.

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
