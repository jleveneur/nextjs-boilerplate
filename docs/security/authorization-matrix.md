# Authorization matrix

Role grants for the closed permission registry. **Source of truth:**
[`packages/authz/src/roles.ts`](../../packages/authz/src/roles.ts) and
[`packages/authz/src/can.test.ts`](../../packages/authz/src/can.test.ts)
(owners must cover every registered action; unknown actions deny by default).

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
| `apiKey:create`       |        | yes   | yes   |

| `apiKey:revoke` | | yes | yes |
| `apiKey:list` | yes | yes | yes |
| `asset:create` | yes | yes | yes |
| `asset:read` | yes | yes | yes |

REST/tRPC must produce the same outcomes for the same `Actor` —
[`apps/api/src/authz-parity.integration.test.ts`](../../apps/api/src/authz-parity.integration.test.ts).
