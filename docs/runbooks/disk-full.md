# Disk full

Symptoms: Postgres or MinIO write failures, container restarts, elevated I/O wait,
`No space left on device` in logs.

---

## Confirm

1. Host: `df -h` on data volumes (Postgres, MinIO/R2 mount, Docker volume path).
2. Docker: `docker system df` — reclaimable images/build cache vs volume growth.
3. Postgres: check table/index bloat and WAL size if using self-hosted Postgres.
4. App logs / Sentry for write errors correlated with the same window.

---

## Immediate mitigation

- Free space: prune unused Docker images (`docker image prune`), old log files, expired backups
  outside the retention window in [backup.md](./backup.md).
- If a single volume is full: expand the volume or migrate data to larger storage (adopter-specific).
- Pause non-critical writers (worker image.derive, bulk imports) until space recovers.
- Do **not** delete the live Postgres data directory or MinIO bucket contents as a first step.

---

## Root-cause investigation

1. Which volume grew? Postgres data, object storage, container logs, or build cache?
2. Unexpected retention: orphan assets (presigned uploads never confirmed), verbose logging,
   unbounded backup copies on the same disk as primary data.
3. Run orphan reconciliation for assets if object storage is the growth source
   ([06 — data and storage](../architecture/06-data-and-storage.md)).

---

## Prevention

- Separate disks/volumes for database, object storage, and backup targets when self-hosting.
- Alert on filesystem use (e.g. >80%) before writes fail.
- Lifecycle rules on object storage; backup retention caps in [backup.md](./backup.md).
- Keep Docker build cache off the database volume.
