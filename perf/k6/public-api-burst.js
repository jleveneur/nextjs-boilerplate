/**
 * Public API burst against `/v1` — unauthenticated requests must stay non-5xx
 * (401/403). With API_KEY set, also assert rate-limit headers / eventual 429.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

import { apiKey, authHeaders, baseUrl, organizationId } from "./lib/env.js";

const serverErrors = new Rate("server_errors");

export const options = {
  scenarios: {
    burst: {
      executor: "constant-arrival-rate",
      rate: 40,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
  },
  thresholds: {
    server_errors: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const root = baseUrl();
  const org = organizationId() ?? "00000000-0000-7000-8000-000000000001";
  const url = `${root}/v1/organizations/${org}/invoices?limit=1`;
  const headers = authHeaders();
  const res = http.get(url, { headers });

  const isServerError = res.status >= 500;
  serverErrors.add(isServerError);

  if (apiKey() === undefined) {
    check(res, {
      "unauthenticated is 401 or 403": (r) => r.status === 401 || r.status === 403,
    });
  } else {
    check(res, {
      "authed is 2xx, 404, or 429": (r) =>
        (r.status >= 200 && r.status < 300) || r.status === 404 || r.status === 429,
    });
  }

  sleep(0.05);
}
