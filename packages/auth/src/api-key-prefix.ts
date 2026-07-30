/** Key prefixes from docs/architecture/07-auth.md §3. */
export function apiKeyPrefixForEnv(appEnv: string): "sk_live_" | "sk_test_" {
  return appEnv === "production" ? "sk_live_" : "sk_test_";
}
