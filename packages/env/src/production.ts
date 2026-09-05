/**
 * Staging/production strictness checks.
 *
 * These catch the most embarrassing class of deploy mistake: a staging URL, a
 * `dev-` prefixed secret, or a Stripe test key reaching a live environment. They
 * run after the schema parse succeeds, keyed on `APP_ENV` of `staging` or
 * `production` — not `NODE_ENV`, which frameworks overload and which is often
 * `production` in staging builds. Preview stays loose so PR apps can use test
 * keys and tunnel URLs.
 */

const LOCALHOST = /^(https?|postgres(ql)?|redis):\/\/(localhost|127\.0\.0\.1|\[::1\])\b/i;

/** Keys whose values are URLs that must not point at a loopback host in production. */
const URL_SUFFIXES = ["_URL", "_URI", "_ENDPOINT", "_HOST"] as const;

const LIVE_APP_ENVS = new Set(["staging", "production"]);

/**
 * Returns human-readable problems for values that are fine in development and
 * fatal in staging/production. Empty array means the env is live-safe, or that
 * this is not a live `APP_ENV`.
 */
export function productionProblems(env: Readonly<Record<string, unknown>>): string[] {
  const appEnv = env["APP_ENV"];
  if (typeof appEnv !== "string" || !LIVE_APP_ENVS.has(appEnv)) {
    return [];
  }

  const problems: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string" || value.length === 0) continue;

    if (looksLikeUrlKey(key) && LOCALHOST.test(value)) {
      problems.push(`${key}: must not point at localhost in production`);
    }

    if (looksLikeSecretKey(key) && value.startsWith("dev-")) {
      problems.push(`${key}: must not use a "dev-" prefix in production`);
    }

    if (key.includes("STRIPE") && /_(test)_/u.test(value)) {
      problems.push(`${key}: must not use a Stripe test key in production`);
    }
  }

  return problems.toSorted();
}

function looksLikeUrlKey(key: string): boolean {
  return URL_SUFFIXES.some((suffix) => key.endsWith(suffix)) || key === "APP_URL";
}

function looksLikeSecretKey(key: string): boolean {
  return (
    key.includes("SECRET") ||
    key.includes("TOKEN") ||
    key.endsWith("_KEY") ||
    key.endsWith("_PASSWORD")
  );
}
