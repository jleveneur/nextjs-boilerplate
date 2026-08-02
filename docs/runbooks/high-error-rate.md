# High error rate

Symptoms: Sentry or Prometheus alert `HighErrorRate`, elevated 5xx in Grafana RED dashboard,
customer reports of failures.

---

## Confirm

1. Open Grafana **RED — web & api** (`http://127.0.0.1:55448`, local) — check which
   `service_name` spiked and when.
2. In Sentry, filter by `environment` and `release` — correlate with a recent deploy.
3. Pick one failing `requestId` from logs or a customer report and trace it:
   - Logs: filter `service` + `requestId`
   - Jaeger: `http://127.0.0.1:55443` — search by trace id from the log line
   - Sentry issue → linked trace id when OTel + Sentry are both enabled

---

## Immediate mitigation

- **Bad deploy:** roll back to the previous SHA (see [deploy.md](./deploy.md)).
- **Dependency down:** enable kill-switch flags if one exists for the subsystem; scale or
  restart the failing dependency container.
- **Traffic spike:** rate-limit at the edge if available; scale web/api replicas.

---

## Root-cause investigation

1. Compare error stack traces before/after the deploy tag.
2. Check database pool saturation and Redis connectivity.
3. Review recent feature-flag rollouts — a half-deployed flag can expose a broken branch.

---

## Prevention

- Add or extend integration tests for the failing path.
- Ensure new endpoints have RED metrics visible on the dashboard before full rollout.
- Every release should have Sentry source maps uploaded when `SENTRY_AUTH_TOKEN` is set in CI.
