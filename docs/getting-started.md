# Getting started

Requires [Node.js](https://nodejs.org) 24+, [pnpm](https://pnpm.io) 12+, and
[Docker](https://docs.docker.com/get-docker/). `make help` lists every target.

## Install

```bash
make setup       # install, `.env` for root/web, deps, migrate, seed
make check       # format, lint, typecheck, layers, tests — the fast local gate
```

Or step by step:

```bash
pnpm install
cp .env.example .env
make deps-up     # Postgres, Redis, MinIO, Mailpit
                 # (make deps-up-observability adds Jaeger, Prometheus, Grafana)
make db-migrate
make db-seed     # optional demo data
```

Configuration is validated by `@repo/env`. App env modules select the
`process.env` values they accept and pass them to `createEnv`; reusable libraries
consume typed configuration rather than ambient state.

## Run the app

```bash
make dev         # deps + web → https://web.localhost
```

Portless serves HTTPS `*.localhost` URLs (proxy on 443). First start may prompt
to trust the local CA (`portless trust`). `PORTLESS=0` uses `localhost:3000`
instead.

Or build the image and run the prod-like stack:

```bash
make images
make prod-up     # Traefik on :8080
```

## Where to read next

0. **Building a real project from this?** Read [starting a project](starting-a-project.md) —
   what to rename, what is already optional, and what removing the worked example costs.
1. [Architecture overview](architecture/README.md) — reading order for the design docs
2. [Principles](architecture/01-principles-and-constraints.md) — what is optimised for
3. [Package graph](architecture/03-package-graph-and-boundaries.md) — layer rules
