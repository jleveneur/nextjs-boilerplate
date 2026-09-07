# Authorization matrix

Role grants for the closed permission registry. **Source of truth:**
[`packages/permissions/src/roles.ts`](../../packages/permissions/src/roles.ts)
(owners must cover every registered action; unknown actions deny by default).

The table below is **generated** — `make authz-matrix` rewrites it and `make check`
fails if it drifts. Edit the registry, not this file.

Cross-tenant resources are denied for non-system actors. Destructive actions are barred while
impersonating ([07 — auth](../architecture/07-auth.md)).

| Action                | member | admin | owner |
| --------------------- | ------ | ----- | ----- |
| `organization:update` |        | yes   | yes   |
| `organization:delete` |        |       | yes   |
| `member:create`       |        | yes   | yes   |
| `member:update`       |        | yes   | yes   |
| `member:delete`       |        | yes   | yes   |
| `invitation:create`   |        | yes   | yes   |
| `invitation:cancel`   |        | yes   | yes   |
| `invoice:create`      | yes    | yes   | yes   |
| `invoice:read`        | yes    | yes   | yes   |
| `invoice:update`      | yes    | yes   | yes   |
| `invoice:void`        |        | yes   | yes   |
| `invoice:export`      | yes    | yes   | yes   |
| `billing:read`        | yes    | yes   | yes   |
| `billing:manage`      |        | yes   | yes   |
| `asset:create`        | yes    | yes   | yes   |
| `asset:read`          | yes    | yes   | yes   |

Every transport must produce the same outcome for the same `Actor`. There is one transport today
([ADR-0014](../adr/0014-single-transport-and-no-background-worker.md)), so the parity test that
proved this across oRPC and REST is gone. What still enforces it: `resolveActor` is the only place
an `Actor` is built, and `authorize()` runs inside the slice service rather than at the transport —
so a new entry point cannot reach a service without passing the same check.
