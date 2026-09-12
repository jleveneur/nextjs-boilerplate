---
name: verify
description: >-
  Run this repository's test suites, including the two that need a live
  PostgreSQL. Use when asked to verify a change, run integration or end-to-end
  tests, reproduce CI locally, or check that the auth, email, and permission
  wiring still works.
---

# Verifying a change

Three suites, split by what they need. `pnpm check` runs only the first.

| Command                 | Covers                                                                           | Needs                |
| ----------------------- | -------------------------------------------------------------------------------- | -------------------- |
| `pnpm check`            | format, type-aware lint, typecheck, knip, React Doctor, unit tests               | nothing              |
| `pnpm test:integration` | Better Auth through the Drizzle adapter, permissions read from real member rows  | PostgreSQL           |
| `pnpm test:e2e`         | verification, password reset, invite and accept, permission gating, in a browser | PostgreSQL, chromium |

Start with `pnpm check`. Run the other two when the change touches the schema,
Better Auth's configuration, a procedure's guards, a page, a form, or an email.

## Running the service-dependent suites

They need a database and the environment the app validates at boot. A throwaway
container is the quickest way there:

```bash
docker run -d --name starter-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app \
  -p 55432:5432 postgres:17-alpine

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/app"
export BETTER_AUTH_SECRET="local-placeholder-secret-at-least-32ch"
export BETTER_AUTH_URL="http://127.0.0.1:3111"
export RESEND_API_KEY=""

pnpm db:migrate
pnpm test:integration
pnpm test:e2e

docker rm -f starter-pg
```

`BETTER_AUTH_URL` must be the port Playwright serves on (3111), or the browser
suite's callback links point somewhere that is not running.

Leave `RESEND_API_KEY` empty. With no key the app appends every message to a
local outbox and the tests read the links out of it — a delivered email cannot
be opened by a test.

## Two things that will bite

**Turbo filters the environment.** A variable the code reads must be listed in
that task's `env` array in `turbo.json`, or it silently falls back to its
default and you debug the wrong thing.

**Your shell may already have these exported.** A stale `DATABASE_URL` from an
earlier run makes a check pass that would fail in CI. When reproducing a CI
failure, clear them: `env -u DATABASE_URL -u BETTER_AUTH_SECRET pnpm knip`.

## A green suite proves nothing until it has failed

Before trusting a new test, break the thing it covers and confirm that test —
and ideally only that test — fails. Then restore. A test written against
already-passing code frequently asserts something other than what its name says.
