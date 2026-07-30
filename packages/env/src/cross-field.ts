/**
 * Cross-field rules that cannot live on individual presets.
 *
 * Presets are merged by shape so they compose (`[base, db, otel]`). Object-level
 * `.refine()` does not survive that merge, so rules that span keys run here
 * against the parsed result. A rule only fires when the relevant keys are
 * present — an app that never composed the otel preset never hears about it.
 */

/**
 * Returns problems for dependent variables. Empty array means the env is
 * internally consistent.
 */
export function crossFieldProblems(env: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = [];

  if (env["OTEL_ENABLED"] === true && env["OTEL_EXPORTER_OTLP_ENDPOINT"] === undefined) {
    problems.push("OTEL_EXPORTER_OTLP_ENDPOINT: required when OTEL_ENABLED is true");
  }

  if (env["TRIGGER_ENABLED"] === true && env["TRIGGER_SECRET_KEY"] === undefined) {
    problems.push("TRIGGER_SECRET_KEY: required when TRIGGER_ENABLED is true");
  }

  if (env["SENTRY_ENABLED"] === true && env["SENTRY_DSN"] === undefined) {
    problems.push("SENTRY_DSN: required when SENTRY_ENABLED is true");
  }

  if (env["GITHUB_CLIENT_ID"] !== undefined && env["GITHUB_CLIENT_SECRET"] === undefined) {
    problems.push("GITHUB_CLIENT_SECRET: required when GITHUB_CLIENT_ID is set");
  }

  if (env["GITHUB_CLIENT_SECRET"] !== undefined && env["GITHUB_CLIENT_ID"] === undefined) {
    problems.push("GITHUB_CLIENT_ID: required when GITHUB_CLIENT_SECRET is set");
  }

  if (env["GOOGLE_CLIENT_ID"] !== undefined && env["GOOGLE_CLIENT_SECRET"] === undefined) {
    problems.push("GOOGLE_CLIENT_SECRET: required when GOOGLE_CLIENT_ID is set");
  }

  if (env["GOOGLE_CLIENT_SECRET"] !== undefined && env["GOOGLE_CLIENT_ID"] === undefined) {
    problems.push("GOOGLE_CLIENT_ID: required when GOOGLE_CLIENT_SECRET is set");
  }

  return problems.toSorted();
}
