/**
 * Read-heavy browsing: web public pages + optional authenticated invoice list.
 */
import http from "k6/http";
import { check, sleep } from "k6";

import { authHeaders, baseUrl, missingAuth, organizationId } from "./lib/env.js";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const root = baseUrl();

  const home = http.get(`${root}/en/sign-in`);
  check(home, {
    "sign-in page ok": (r) => r.status === 200,
  });

  const health = http.get(`${root}/api/health`);
  check(health, {
    "web health ok": (r) => r.status === 200,
  });

  if (!missingAuth()) {
    const org = organizationId();
    const list = http.get(`${root}/v1/organizations/${org}/invoices?limit=20`, {
      headers: authHeaders(),
    });
    check(list, {
      "invoice list ok or empty": (r) =>
        (r.status >= 200 && r.status < 300) || r.status === 404 || r.status === 429,
    });
  }

  sleep(0.3);
}
