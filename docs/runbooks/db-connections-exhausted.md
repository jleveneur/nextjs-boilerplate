# Database connections exhausted

Symptoms: `too many clients already`, API/worker 503s, Postgres `pg_stat_activity` near
`max_connections`, timeouts acquiring a pool client.

---

## Confirm

1. Postgres: `SHOW max_connections;` and
   `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();`
2. Per-app `DATABASE_POOL_SIZE` and replica count — apply the budget in [deploy.md](./deploy.md):

   ```
   (sum over app replicas of DATABASE_POOL_SIZE)
     + 1                  # migrate job
     + admin / tooling
     ≤ Postgres max_connections
   ```

3. Look for connection leaks: long-idle sessions, abandoned transactions,
   `pg_stat_activity` rows with `state = 'idle in transaction'`.

---

## Immediate mitigation

- Reduce load: scale **down** misconfigured replicas that multiplied pools, or temporarily lower
  `DATABASE_POOL_SIZE` and redeploy.
- Kill idle-in-transaction backends only after confirming they are not a deploy/migrate:
  `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE …` (be surgical).
- Pause non-essential workers if they hold many connections.
- Do not raise `max_connections` as the first fix without checking memory
  (`max_connections` × `work_mem` can OOM the host).

---

## Root-cause investigation

1. Did a deploy add replicas without updating the budget spreadsheet?
2. Are web, api, and worker all pointed at Postgres without a pooler when they should use one?
3. Integration/test stacks left running against the same instance?
4. Compare with [scaling.md](./scaling.md) — load tests that raise API rate limits without pool
   headroom will land here next.

---

## Prevention

- Track the connection budget in every environment change review.
- Prefer PgBouncer / managed pooler in front of Postgres when replica count grows.
- Keep migrate jobs at `DATABASE_POOL_SIZE=1`.
- Alert when `pg_stat_activity` count exceeds ~80% of `max_connections`.
