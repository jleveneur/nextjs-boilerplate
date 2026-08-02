# Queue backlog

Symptoms: Prometheus alert `QueueBacklogGrowing`, Grafana **Queue — worker** shows rising
`bullmq_queue_waiting`, jobs stuck retrying, emails or async work delayed.

---

## Confirm

1. Grafana **Queue — worker** — which queue is growing (`email`, `image`, `outbox`, …)?
2. Worker logs — search `jobName`, `jobId`, `attempt` for repeated failures.
3. Redis — `LLEN` / BullMQ UI (if installed) for waiting and delayed counts.
4. Jaeger — find the trace that enqueued the job (W3C context is carried in the job envelope).

---

## Immediate mitigation

- **Worker down:** restart `apps/worker`; confirm `GET /health` on `WORKER_PORT`.
- **Poison message:** move the job to DLQ or remove after capturing payload for debugging.
- **Redis memory:** ensure `maxmemory-policy noeviction` (compose default) — eviction drops jobs silently.

---

## Root-cause investigation

1. Read the job error from worker logs or Sentry (`captureUnexpectedException` on handler failure).
2. Trace upstream: domain event → outbox row → enqueue → consumer span.
3. Check external deps (Resend, S3/MinIO, Postgres) for timeouts in the same window.

---

## Prevention

- Integration tests for each job handler (see `apps/worker` proofs).
- Alert on DLQ growth, not only queue depth.
- Document expected queue throughput after load tests (Phase 16).
