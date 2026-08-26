---
"@repo/jobs": minor
---

Upgrade BullMQ to 6.2.2 and ioredis to 6.0.0 together.

BullMQ pinned `ioredis@5.11.1` as a hard dependency until v6, where it became
an optional peer — so ioredis 6 could not be adopted without it. The `JobQueue`
port is unchanged and no call sites moved; v6's removed APIs (legacy repeatable
jobs, `Queue#client`, `debounce`) were already unused. Queues stay on the Redis
backend. See ADR-0010.
