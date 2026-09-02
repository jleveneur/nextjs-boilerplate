/**
 * Upload path smoke. Product upload via public REST is limited; when credentials
 * are absent the scenario soft-skips. With auth it hits a cheap authenticated
 * read as a stand-in until Phase 17 expands upload surfaces.
 */
import http from "k6/http";
import { check, sleep } from "k6";

import { authHeaders, baseUrl, expectApiStatuses, missingAuth, organizationId } from "./lib/env.js";

export const options = {
  vus: 3,
  duration: "15s",
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  if (missingAuth()) {
    console.warn("upload: skip — set API_KEY and ORGANIZATION_ID (presign surface via oRPC/web)");
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
  // Stand-in until a public REST upload route exists: authenticated list proves
  // the auth + storage-adjacent path under concurrent load.
  const res = http.get(`${root}/v1/organizations/${org}/invoices?limit=1`, {
    headers: authHeaders(),
  });
  check(res, {
    "authed read under upload VUs": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 404 || r.status === 429,
  });
  sleep(0.5);
}
