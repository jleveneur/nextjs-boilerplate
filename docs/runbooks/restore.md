# Restore

Restore procedure for PostgreSQL (and notes for object storage). Pair with [backup.md](./backup.md).

---

## Tooling path (this repo)

`make restore-drill` dumps the local `app` database, restores into `app_restore_drill`, runs
migrations, smokes `information_schema`, then drops the scratch DB. Requires `make deps-up`.

```bash
make deps-up
make db-migrate
make restore-drill
```

Nightly CI runs the same script (`.github/workflows/nightly-hardening.yml`).

---

## Production / staging restore (adopter)

1. **Declare the incident** and freeze writes if corruption is suspected.
2. **Choose a restore point** (PITR timestamp or dump file) from before the damage.
3. **Restore into a scratch database** (never overwrite primary until verified):
   - Managed: create a branch / PITR instance at the chosen time.
   - Self-hosted: `CREATE DATABASE …` / new volume; `pg_restore` or `psql < dump.sql`.
4. **Migrate** the scratch DB to the target app SHA if needed (`node dist/migrate.mjs`).
5. **Smoke**: auth sign-in, one tenant-scoped read, one write; worker health.
6. **Cut over** per your orchestration (DNS, compose, k8s) only after smoke passes.
7. **Record evidence** below.

Object storage: restore deleted objects from versioning; quarterly spot-check one known key
([06](../architecture/06-data-and-storage.md)).

---

## Evidence (fill after each real drill)

| Field              | Value                |
| ------------------ | -------------------- |
| Date (UTC)         |                      |
| Operator           |                      |
| Environment        | staging / production |
| Restore point      |                      |
| RTO achieved       |                      |
| Smoke results      | pass / fail          |
| Notes / follow-ups |                      |

Targets: **RPO ≤ 5 minutes**, **RTO ≤ 1 hour**.
