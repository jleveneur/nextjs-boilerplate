/**
 * Next.js instrumentation hook — boots OTel/Sentry for the Node server runtime.
 */

export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "edge") {
    return;
  }

  const { initObservability } = await import("@repo/observability");
  const { env } = await import("./env/server.ts");

  const release = env.SENTRY_RELEASE ?? process.env["GITHUB_SHA"];
  initObservability({
    serviceName: env.OTEL_SERVICE_NAME === "app" ? "web" : env.OTEL_SERVICE_NAME,
    otel: {
      enabled: env.OTEL_ENABLED,
      ...(env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
        ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
        : {}),
      ...(release !== undefined ? { version: release } : {}),
    },
    sentry: {
      enabled: env.SENTRY_ENABLED,
      ...(env.SENTRY_DSN !== undefined ? { dsn: env.SENTRY_DSN } : {}),
      environment: env.SENTRY_ENVIRONMENT ?? env.APP_ENV,
      ...(release !== undefined ? { release } : {}),
    },
  });
}
