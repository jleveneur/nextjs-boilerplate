# 09 — Environment, configuration & secrets

---

## 1. Configuration principles

1. **Configuration comes from the environment; nothing else.** No config files per environment, no
   `if (env === "production")` branches in business logic. A branch on environment name is a
   different code path that production runs and nobody tests.
2. **Validated once, at the edge of the process.** Invalid configuration fails at build or boot,
   never at the first request that happens to need it.
3. **Typed at every access site.** `env.DATABASE_URL` is `string`, not `string | undefined`.
4. **`process.env` is accessed in exactly one package.** Everywhere else imports `@repo/env`.
5. **Server and client configuration are physically separate**, so a secret cannot reach the
   browser by mistake.
6. **The same artifact runs in every environment.** Behaviour differences come from values, so
   staging can be made to behave exactly like production for debugging.

---

## 2. `@repo/env`

### Why hand-rolled rather than `@t3-oss/env-nextjs`

The dependency bar from [01](./01-principles-and-constraints.md#6-minimal-but-powerful-dependencies)
applied honestly: this is roughly 80 lines of Zod. We need behaviour that a general-purpose library
makes awkward anyway — per-app schema composition (each app validates only the variables it
actually needs, so `apps/worker` does not require Stripe keys), a build-time skip for Docker image
builds, and coercion rules of our own. And a config layer is exactly where you least want to be
blocked by an upstream release.

### Shape

```
packages/env/src/
├── server.ts    # Secrets and server-only config. Imports "server-only".
├── client.ts    # NEXT_PUBLIC_* only. Safe in the browser.
├── shared.ts    # Present and identical in both (NODE_ENV, APP_URL, APP_ENV)
└── presets/     # Composable groups: db, redis, s3, stripe, resend, otel, posthog, sentry, auth
```

Each app composes the presets it needs:

```
// illustrative — apps/worker
export const env = createEnv({
  server: [base, db, redis, s3, resend, otel],
})
```

This is the payoff of composition over one monolithic schema: an app fails fast on _its_ missing
variables, and nothing is required to hold credentials it never uses.

### Validation rules

- **Typed coercion, not strings.** Ports and pool sizes are `z.coerce.number().int().positive()`;
  booleans are `z.enum(["true","false"]).transform(...)`, because `Boolean("false")` is `true` and
  that bug ships silently.
- **Semantic validation, not just presence.** `DATABASE_URL` must parse as a `postgres://` URL,
  `APP_URL` must be a valid absolute URL, secrets have minimum lengths.
- **Cross-field refinements.** If `TRIGGER_ENABLED=true`, then `TRIGGER_SECRET_KEY` is required.
  This is where a hand-rolled module earns its place.
- **Production-only strictness.** `refine`s that reject development defaults when `APP_ENV` is
  `production`: no `localhost` URLs, no `dev-` prefixed secrets, no `test` Stripe keys. This
  single check catches the most embarrassing class of deploy mistake.
- **Fail loudly.** Errors print every invalid variable at once with its reason — never one at a
  time, which turns a first deploy into a guessing game.
- **`SKIP_ENV_VALIDATION=1`** for Docker builds where runtime secrets are legitimately absent.
  Validation then happens at container start instead.

### Client safety

`client.ts` accepts only `NEXT_PUBLIC_`-prefixed keys, enforced by the schema itself. `server.ts`
imports `server-only`, so any client component reaching it fails the build with a clear error. A
CI check additionally greps the client bundle for known secret patterns — belt and braces, because
this failure mode is unrecoverable once published.

---

## 3. Environments

| Environment  | Purpose                 | Database                                 | Deployment                           |
| ------------ | ----------------------- | ---------------------------------------- | ------------------------------------ |
| `local`      | Development on a laptop | Docker Postgres                          | `make dev`                           |
| `test`       | Automated tests         | Ephemeral Postgres, transaction-per-test | CI + local                           |
| `preview`    | Per-pull-request review | Neon branch, seeded                      | Auto on PR, torn down on merge       |
| `staging`    | Production rehearsal    | Dedicated database, anonymised copy      | Auto on merge to `main`              |
| `production` | Real users              | Primary database, PITR                   | Manual promotion of a tagged release |

`APP_ENV` (not `NODE_ENV`) distinguishes them. `NODE_ENV` is only ever `development`, `test`, or
`production`, because framework and library behaviour depends on it and overloading it with a
fourth value breaks optimisations in subtle ways.

**Staging is a genuine rehearsal**: same images, same migration path, same Traefik configuration,
same secret mechanism. Its value is entirely in being identical; a staging environment configured
differently from production tests nothing.

**Preview environments** are where Neon's branching pays for itself: each PR gets a real database
branched from staging's schema, so migrations are exercised on realistic data before merge.

### Local development

`make setup` is idempotent and does everything: check tool versions, `pnpm install`, copy
`.env.example` → `.env.local`, start Docker services, wait for health, migrate, seed, print next
steps.

Local services in `docker/compose.yaml`: PostgreSQL 18, Redis, MinIO (with the bucket
pre-created), Mailpit (SMTP catcher with a web UI so email is inspectable without sending),
and an OTel collector plus Jaeger so traces are visible locally rather than being a
production-only luxury.

`.env.example` is committed, exhaustively commented, and contains working defaults for every local
service. It is the reference for what exists; a variable added without a documented entry there is
treated as incomplete work.

---

## 4. Secrets management

**SOPS + age. Encrypted files committed to the repository.**

### Why this rather than a secret manager

| Option                                  | Assessment                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SOPS + age** ✅                       | Secrets are versioned with the code that needs them, reviewable as diffs (SOPS encrypts values but not keys, so a diff shows _which_ secret changed without revealing it), no service to run, no vendor, works identically in CI and on hosts, and rollback is a git revert. |
| Vault                                   | Powerful and operationally heavy: a service to run, unseal, back up, and monitor. Disproportionate at this scale.                                                                                                                                                            |
| Cloud secret managers                   | Vendor lock-in in the one place it hurts most, plus a bootstrap problem: you need a credential to fetch credentials.                                                                                                                                                         |
| `.env` files copied to servers manually | Unversioned, undiffable, unauditable, and inevitably divergent.                                                                                                                                                                                                              |
| GitHub Secrets alone                    | Fine for CI, but no history, no diffs, no local decryption, and a poor fit for host-level configuration.                                                                                                                                                                     |

`age` over GPG: modern, tiny, no keyring or trust-model complexity, and a keypair is two short
strings — which matters because key handling is where secret systems actually fail.

### Layout

```
infra/secrets/
├── .sops.yaml              # Rules: which key encrypts which path
├── staging.enc.yaml
├── production.enc.yaml
└── shared.enc.yaml         # Values common to all environments
```

Keys:

| Holder        | Key                                                   | Purpose                         |
| ------------- | ----------------------------------------------------- | ------------------------------- |
| Each engineer | Personal `age` key                                    | Local decryption for debugging  |
| CI            | `age` key in a GitHub Actions secret                  | Decrypt at deploy time          |
| Each host     | Host `age` key, provisioned by Ansible                | Decrypt on the machine          |
| Break-glass   | Offline key in a password manager plus a printed copy | Recovery if all others are lost |

Any of these keys can decrypt, and the recipient list is in `.sops.yaml`, so **removing a departed
engineer is a re-encryption commit** — reviewable and complete, rather than a hope that nobody
kept a copy.

### Workflow

```
make secrets-edit ENV=production    # Decrypt to a temp file, open $EDITOR, re-encrypt on save
make secrets-view ENV=staging
make secrets-rotate KEY=STRIPE_SECRET_KEY ENV=production
```

Plaintext never touches disk unencrypted (SOPS uses a temp file cleaned on exit), `.gitignore`
covers every `.env*` except `.env.example`, and Gitleaks runs pre-commit and in CI.

### Rotation

| Secret                                 | Cadence                              | Notes                                       |
| -------------------------------------- | ------------------------------------ | ------------------------------------------- |
| Database passwords                     | 90 days                              | Requires a coordinated restart              |
| API keys (outbound: Stripe, Resend, …) | 180 days, immediately on suspicion   | Providers support overlapping keys          |
| Auth signing secret                    | 180 days                             | Rotating invalidates sessions — schedule it |
| Customer API keys                      | Customer-controlled                  | Overlapping keys supported                  |
| `age` keys                             | Annually, immediately on team change | Re-encrypt all files                        |

Rotation is a documented runbook with the blast radius stated for each secret, because the
question during an incident is never "how do I rotate this" but "what breaks when I do".

---

## 5. Build-time versus runtime configuration

An easy thing to get wrong with Next.js, and expensive to discover late.

| Kind           | Examples                                                        | When read     | Consequence                                |
| -------------- | --------------------------------------------------------------- | ------------- | ------------------------------------------ |
| **Build-time** | `NEXT_PUBLIC_*` (inlined into the bundle), build metadata       | `next build`  | Changing the value requires a rebuild      |
| **Runtime**    | `DATABASE_URL`, all secrets, feature-flag defaults, `LOG_LEVEL` | Process start | Changing the value requires only a restart |

Consequence for the image strategy: **`NEXT_PUBLIC_*` values are baked into the image**, so an
image is tied to the public configuration it was built with. We therefore keep the
`NEXT_PUBLIC_*` set deliberately minimal (app URL, PostHog key, Sentry DSN) and everything else at
runtime, so **one image can be promoted from staging to production unchanged** — which is the
property the whole deployment strategy depends on. Where a public value must differ per
environment, it is served from a runtime-read endpoint rather than inlined.
