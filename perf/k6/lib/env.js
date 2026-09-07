/**
 * Shared k6 env helpers for the load scenarios.
 *
 * Defaults target the local prod-like Traefik stack (`make prod-up` → :8080).
 */

export function baseUrl() {
  return (__ENV.BASE_URL || __ENV.LOAD_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
}
