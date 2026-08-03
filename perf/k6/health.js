/**
 * Baseline smoke: web and API health via Traefik (make prod-up).
 */
import http from "k6/http";
import { check, sleep } from "k6";

import { baseUrl } from "./lib/env.js";

export const options = {
  vus: 5,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const root = baseUrl();
  const web = http.get(`${root}/api/health`);
  check(web, {
    "web health 200": (r) => r.status === 200,
  });

  const api = http.get(`${root}/health`);
  check(api, {
    "api health 200": (r) => r.status === 200,
  });

  const ready = http.get(`${root}/health/ready`);
  check(ready, {
    "api ready 200": (r) => r.status === 200,
  });

  sleep(0.2);
}
