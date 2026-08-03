# k6 load scenarios (Phase 16)

Not part of PR CI. Scripts are JavaScript, but they run on the **k6 Go runtime** — not
Node/`pnpm`. Local and CI both use the official Docker image (`grafana/k6`), same shape as ZAP.

```bash
make prod-up          # Traefik on :8080
make load             # docker run grafana/k6 against LOAD_BASE_URL
```

| Script                | What it stresses                                            |
| --------------------- | ----------------------------------------------------------- |
| `health.js`           | Web `/api/health`, API `/health` + `/health/ready`          |
| `public-api-burst.js` | `/v1` burst (401 without key; rate limits with `API_KEY`)   |
| `read-heavy.js`       | Public pages + optional invoice list                        |
| `write-heavy.js`      | Invoice creates when `API_KEY` + `ORGANIZATION_ID` set      |
| `upload.js`           | Soft-skip / authenticated stand-in until REST upload exists |

Environment:

| Variable          | Default                            | Purpose                               |
| ----------------- | ---------------------------------- | ------------------------------------- |
| `LOAD_BASE_URL`   | `http://host.docker.internal:8080` | Origin as seen from the k6 container  |
| `API_KEY`         | unset                              | Bearer for authenticated scenarios    |
| `ORGANIZATION_ID` | unset                              | Tenant for `/v1/organizations/...`    |
| `K6_IMAGE`        | `grafana/k6:1.3.0`                 | Override to pin/bump the runner image |

Saturation findings live in [`docs/runbooks/scaling.md`](../../docs/runbooks/scaling.md).
