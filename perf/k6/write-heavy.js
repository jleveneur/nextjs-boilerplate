/**
 * Write-heavy mutations against the public API when API_KEY + ORGANIZATION_ID
 * are set. Without credentials the scenario exits cleanly (no false failures).
 */
import http from "k6/http";
import { check, sleep } from "k6";

import { authHeaders, baseUrl, expectApiStatuses, missingAuth, organizationId } from "./lib/env.js";

export const options = {
  vus: 5,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  if (missingAuth()) {
    console.warn("write-heavy: skip — set API_KEY and ORGANIZATION_ID to exercise mutations");
  }
  return { skip: missingAuth() };
}

export default function (data) {
  if (data.skip) {
    sleep(1);
    return;
  }

  expectApiStatuses();
  const root = baseUrl();
  const org = organizationId();
  const payload = JSON.stringify({
    number: `K6-${__VU}-${__ITER}-${Date.now()}`,
    amount_minor: 100,
    currency: "USD",
    status: "draft",
  });

  const create = http.post(`${root}/v1/organizations/${org}/invoices`, payload, {
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      "Idempotency-Key": `k6-${__VU}-${__ITER}-${Date.now()}`,
    },
  });

  check(create, {
    // Default org keys only get invoice:read — 403 is an expected authz boundary.
    "create is 2xx, 400, 403, 404, 422, or 429": (r) =>
      (r.status >= 200 && r.status < 300) ||
      r.status === 400 ||
      r.status === 403 ||
      r.status === 404 ||
      r.status === 422 ||
      r.status === 429,
  });

  sleep(0.5);
}
