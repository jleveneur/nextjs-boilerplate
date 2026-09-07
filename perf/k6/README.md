# k6 load scenarios

Not part of PR CI. Scripts are JavaScript, but they run on the **k6 Go runtime** — not
Node/`pnpm`. Local and CI both use the official Docker image (`grafana/k6`), same shape as ZAP.

```bash
make prod-up          # Traefik on :8080
make load             # docker run grafana/k6 against LOAD_BASE_URL
```

| Script          | What it stresses                          |
| --------------- | ----------------------------------------- |
| `health.js`     | Web `/api/health` and `/api/health/ready` |
| `read-heavy.js` | Public pages                              |

Environment:

| Variable        | Default                            | Purpose                               |
| --------------- | ---------------------------------- | ------------------------------------- |
| `LOAD_BASE_URL` | `http://host.docker.internal:8080` | Origin as seen from the k6 container  |
| `K6_IMAGE`      | `grafana/k6:1.3.0`                 | Override to pin/bump the runner image |

## Coverage gap

These scenarios only exercise unauthenticated `GET` traffic. The mutating surface is oRPC
(`POST /api/rpc`, batched), which these scripts do not drive — an authenticated write path
would need a session cookie jar and an oRPC-shaped request body. Scenarios for `/v1` REST
burst, invoice creates, and uploads were removed along with the public REST API.

Saturation findings live in [`docs/runbooks/scaling.md`](../../docs/runbooks/scaling.md).
