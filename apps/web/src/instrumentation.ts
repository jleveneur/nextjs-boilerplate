/**
 * Next.js instrumentation hook — boots OpenTelemetry for the Node server runtime.
 */

export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] === "edge") {
    return;
  }

  const [{ initObservability }, { env }] = await Promise.all([
    import("@repo/observability"),
    import("./env/server.ts"),
  ]);

  const release = process.env["GITHUB_SHA"];
  initObservability({
    serviceName: env.OTEL_SERVICE_NAME === "app" ? "web" : env.OTEL_SERVICE_NAME,
    otel: {
      enabled: env.OTEL_ENABLED,
      ...(env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
        ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
        : {}),
      ...(release !== undefined ? { version: release } : {}),
    },
  });
}
