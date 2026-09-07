import { check, sleep } from "k6";
/**
 * Read-heavy browsing: web public pages.
 */
import http from "k6/http";

import { baseUrl } from "./lib/env.js";

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

  sleep(0.3);
}
