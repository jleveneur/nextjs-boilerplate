# Backup

Untested backups are not backups. Targets and cadence follow
[06 — data and storage](../architecture/06-data-and-storage.md): **RPO ≤ 5 minutes**,
**RTO ≤ 1 hour**.

---

## What to back up

| Store          | Mechanism                                                                   | Retention (baseline)           |
| -------------- | --------------------------------------------------------------------------- | ------------------------------ |
| PostgreSQL     | Managed PITR (e.g. Neon) **or** `pg_dump` + WAL archiving to object storage | 30 days PITR, 12 monthly dumps |
| Object storage | Provider versioning + lifecycle rules (R2/S3/MinIO)                         | ≥ 30 days for deletions        |

Application images are immutable in GHCR (`:sha`) — do not treat the registry as a data backup.

---

## Local / self-hosted dump

With `make deps-up` Postgres on host port `55432`:

```bash
docker compose -f docker/compose.yaml exec -T postgres \
  pg_dump -U postgres --no-owner --no-acl app > backup-$(date -u +%Y%m%dT%H%M%SZ).sql
```

Store the file **off** the database volume (see [disk-full.md](./disk-full.md)).

---

## Before every production migrate

1. Note the current PITR / dump timestamp.
2. Run migrate to completion (`node dist/migrate.mjs` via the api image).
3. Keep the pre-migrate restore point until smoke checks pass
   ([deploy.md](./deploy.md)).

---

## Verification

Exercise restore on a schedule — [restore.md](./restore.md) and `make restore-drill` for the
tooling path; monthly managed PITR restore into a scratch database for production.
