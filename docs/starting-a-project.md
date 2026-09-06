# Starting a project from this repo

[`getting-started`](../apps/docs/content/docs/getting-started.mdx) tells you how to run _this_
repo. This page tells you how to make it _yours_: what to rename, what to delete, and what the
deletion actually costs.

Read it once before writing a feature. The expensive mistake is building on top of the worked
example instead of beside it, and then discovering the two are indistinguishable.

---

## 1. What you inherit

Three different kinds of thing ship here, and they are removed in three different ways.

| Kind             | Examples                                                         | How you remove it            |
| ---------------- | ---------------------------------------------------------------- | ---------------------------- |
| **Foundation**   | auth, tenancy, layering, errors, jobs, outbox, observability, CI | You don't. This is the repo. |
| **Integrations** | Stripe, S3, PostHog, OTel, Resend                                | Leave the env unset          |
| **Example**      | invoices, billing pages, the `/v1` invoice routes                | Delete it (see §4)           |

The distinction matters because **most integrations are already optional**. Every one of them sits
behind a port with a no-op implementation, so an unset credential is a supported state rather than
a crash:

```bash
# Stripe absent → createPaymentGateway returns the no-op gateway
# PostHog absent → capture() is a no-op sink
# OTel absent → tracing is disabled
```

So "I don't need Stripe on this project" needs **no code change at all**. Deleting the billing
example is about not carrying dead UI and schema, not about making the app boot.

---

## 2. Rename what is user-visible

`@repo/*` is a namespace, not a brand. Leave it — renaming 300 files buys nothing, and every
internal import stays stable.

What is actually worth changing:

| Where                                   | What                                             |
| --------------------------------------- | ------------------------------------------------ |
| `apps/api/src/app.ts`, `openapi-app.ts` | `"Repo Public API"` → your API title             |
| `apps/api/openapi.json`                 | regenerate: `make openapi-check` shows the drift |
| `apps/web/src/messages/{en,fr}.json`    | product name in UI copy                          |
| `package.json` `description`            | one line                                         |
| `docker/compose*.yaml` `name:`          | container prefix (`repo-test` → `acme-test`)     |
| `.changeset/config.json`                | nothing — it works as-is                         |

Then delete the history that is not yours: `docs/architecture/14-build-history.md`, the ADRs you
did not decide (keep the ones whose decisions you are inheriting — they explain why the code looks
the way it does), and `CHANGELOG.md` files under `packages/*`.

---

## 3. Decide what to keep

Run the inventory. It is computed from the tree, so it is accurate today rather than when this
page was written:

```bash
make example-inventory                    # every optional subsystem
make example-inventory FEATURE=billing    # just one
```

It reports three numbers per subsystem: files to delete outright, files that **will not compile**
until you fix them, and files that merely mention it (a nav label, a seed row, a test fixture).

At the time of writing:

| Subsystem   | Delete | Breaks | Notes                                                       |
| ----------- | ------ | ------ | ----------------------------------------------------------- |
| `publicApi` | 1      | **0**  | `apps/api` is layer 4 — nothing imports it. Delete the dir. |
| `docsSite`  | 1      | **0**  | Same. `docs/` still renders on GitHub without it.           |
| `analytics` | 1      | 4      | Or just leave `POSTHOG_API_KEY` unset.                      |
| `assets`    | 6      | 11     | S3 uploads + image derivatives.                             |
| `billing`   | 25     | 16     | The commerce example. The big one.                          |

**Start with the two zero-cost ones.** If you are not shipping a public REST API, deleting
`apps/api` removes an entire transport, its OpenAPI drift check, its container image, its Trivy
scan, and the parity test — and nothing else in the repo notices. Same for `apps/docs`.

---

## 4. Removing the billing example

This is the one that costs real time, so here is the honest shape of it.

The 16 breaking files are almost entirely **registries and composition roots**: the id union, the
error-code table, the permission registry, the job registry, the db schema barrel, the core
barrel, and the three app containers. That is not accidental coupling — it is the closed-registry
design working as intended. A feature is _supposed_ to have exactly one place it registers itself
in each dimension. The cost of that is that removing a feature means visiting each one.

Order that keeps the tree compiling for the longest:

1. **Delete the owned paths** (`make example-inventory FEATURE=billing` lists them).
2. **Unregister, from the leaves inward.** Apps first (`apps/*/src/**/container.ts`, `app.ts`,
   nav links in `layout.tsx`), then transport (`packages/orpc`), then domain (`packages/core`),
   then the layer-0 registries.
3. **Registries last**, because everything else references them:
   - `packages/permissions/src/registry.ts` + `roles.ts` — drop `invoice:*` and `billing:*`
   - `packages/types/src/ids.ts` — drop `InvoiceId`
   - `packages/errors/src/codes.ts` — drop the invoice codes
   - `packages/jobs/src/registry.ts` + `bullmq-worker.ts` — drop the jobs and their switch arms
   - `packages/db/src/schema/index.ts`, `packages/contracts/src/index.ts`, `packages/core/src/index.ts`
4. **Env**: drop `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from all four catalogs (`make env-catalog` verifies they
   agree).
5. **Schema**: for a project that has never deployed, delete the migrations and regenerate one
   initial migration rather than shipping a migration that creates tables you just deleted.
6. **Regenerate the derived artefacts**: `make authz-matrix`, then `make openapi-check`.

Verify with `make check`, which will find every dangling import, unused export (knip), and stale
permission row for you. That is the point of the gate being strict.

> **Keep the outbox and the audit log.** They live near the billing code and look like part of it.
> They are not — they are foundation, and rebuilding transactional event delivery later is far more
> expensive than carrying it now.

---

## 5. Adding your first slice

Budget ~20–25 files for one CRUD resource. Again, that is the registries, not ceremony. Copy the
invoice slice as the template _before_ you delete it — it is the most complete worked example in
the repo, and it demonstrates every layer boundary you are about to cross.

The path a request takes, and the file you add at each step:

| Layer | File                                                               |
| ----- | ------------------------------------------------------------------ |
| 0     | `packages/types/src/ids.ts` — branded id                           |
| 0     | `packages/contracts/src/<thing>.ts` — Zod schemas                  |
| 0     | `packages/permissions/src/registry.ts` — `thing:create`, …         |
| 0     | `packages/errors/src/codes.ts` — failure codes                     |
| 1     | `packages/db/src/schema/<thing>.sql.ts` + a migration              |
| 2     | `packages/core/src/<thing>/` — service, repository, policy, mapper |
| 3     | `packages/orpc/src/routers/<thing>.ts`                             |
| 4     | `apps/web/src/features/<thing>/` + a route                         |

Rules that are enforced, not suggested — see [AGENTS.md](../AGENTS.md):

- Services take an explicit **actor**, authorize **first**, and scope **every** query by
  `organization_id`. Use `TenantCtx` and `scopedWhere`; a repository that takes a bare database
  handle is a tenant leak waiting to happen.
- Transports translate. No queries in an oRPC procedure or a route handler.
- Money is an integer in minor units. Ids are UUIDv7 and branded.

---

## 6. Before you build anything

```bash
make setup && make check     # green on a clean clone
```

Then set up what the boilerplate cannot set up for you:

- **`vars.RELEASE_APP_ID`** in GitHub, or the release workflow stays skipped. It has never run
  on this repo, so treat your first release as an untested path and do a dry run.
- **Error aggregation.** There is structured logging and OTel tracing, but nothing groups
  exceptions. Traces answer "why was this request slow"; they do not answer "what is broken this
  week".
- **CSP**, if you are exposing the web app publicly — it is deliberately left to the TLS edge
  ([security review](./security/security-review.md)), which means it is not on until you turn it on.
