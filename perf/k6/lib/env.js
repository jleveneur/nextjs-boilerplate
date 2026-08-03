/**
 * Shared k6 env helpers for Phase 16 load scenarios.
 *
 * Defaults target the local prod-like Traefik stack (`make prod-up` → :8080).
 */

import http from "k6/http";

/**
 * Treat auth / rate-limit responses as expected so they do not trip
 * `http_req_failed` when exercising `/v1` under load.
 */
export function expectApiStatuses() {
  http.setResponseCallback(http.expectedStatuses(200, 201, 204, 401, 403, 404, 422, 429));
}

export function baseUrl() {
  return (__ENV.BASE_URL || __ENV.LOAD_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
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
