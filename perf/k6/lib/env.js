/**
 * Shared k6 env helpers for Phase 16 load scenarios.
 *
 * Defaults target the local prod-like Traefik stack (`make prod-up` → :8080).
 */

export function baseUrl() {
  return (__ENV.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
}

export function apiKey() {
  const key = __ENV.API_KEY;
  return key !== undefined && key !== "" ? key : undefined;
}

export function organizationId() {
  const id = __ENV.ORGANIZATION_ID;
  return id !== undefined && id !== "" ? id : undefined;
}

/** Auth headers when API_KEY is set; otherwise empty (public probes). */
export function authHeaders() {
  const key = apiKey();
  if (key === undefined) {
    return {};
  }
  return { Authorization: `Bearer ${key}` };
}

/**
 * Soft-skip a scenario when required credentials are missing.
 * k6 has no native skip — return early from `default` after a tagged no-op check.
 */
export function missingAuth() {
  return apiKey() === undefined || organizationId() === undefined;
}
