# 14 — Build history

The foundation was built in **phased, reviewable pull requests**, each leaving the repository
working with CI green. That programme is **complete**. This page is an archive of the sequence —
not a backlog, and not a description of current work.

Current design lives in [the architecture index](./README.md). Decisions live in the
[ADR log](../adr/README.md).

Two rules governed the order and still govern new work:

1. **Verification infrastructure comes before the things it verifies.** The toolchain and CI
   exist so nothing is written unverified and retrofitted.
2. **Every change ends with something demonstrable.** Not "the package exists" but "a test
   proves the behaviour".

---

## Sequence

| #   | Phase                     | What landed                                                                                      |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| 0   | Decisions                 | Q1–Q5 accepted; ADRs 0006–0009 moved to Accepted (0007 later superseded by 0009)                 |
| 1   | Skeleton & toolchain      | Monorepo, TypeScript 7, Oxlint, Oxfmt, hooks, `make check`, layer assertion                      |
| 2   | Foundation packages       | `types`, `utils`, `env`, `errors`, `contracts`, `i18n`                                           |
| 3   | Data layer                | `@repo/db`: schema, migrations, seeds, real-Postgres test harness                                |
| 4   | Platform adapters         | `logger`, `cache`, `storage`, `email`, `jobs`, `observability`                                   |
| 5   | Auth & authorization      | `@repo/authz`, `@repo/auth`, sign-up/in, organizations                                           |
| 6   | Domain core & private API | `@repo/core`, `@repo/orpc`, billing vertical slice ([ADR-0011](../adr/0011-orpc-private-api.md)) |
| 7   | Design system             | `@repo/ui` on Base UI; chart/editor/table subpaths followed with payments                        |
| 8   | Web application           | `apps/web`: routing, i18n, theming, auth screens, invoice UI, E2E                                |
| 9   | Public API                | `apps/api`: REST `/v1`, OpenAPI, Scalar, API keys, rate limits                                   |
| 10  | Workers                   | `apps/worker`: BullMQ consumers, schedules, outbox relay                                         |
| 11  | Containers & local stack  | Dockerfiles, compose stacks, `make` targets                                                      |
| 12  | CI/CD                     | Full pipelines, GHCR images, Changesets, Renovate                                                |
| 13  | Deployability             | Migrate-then-roll, env catalog, agnostic deploy runbook                                          |
| 14  | Observability wiring      | OTel, Sentry, PostHog, `@repo/flags`, dashboards, alerts                                         |
| 15  | Documentation site        | `apps/docs` (Fumadocs) syncing `docs/`                                                           |
| 16  | Hardening                 | k6, ZAP, security review, runbooks, restore drill                                                |
| 17  | Payments + UI widgets     | `@repo/payments`, Stripe billing, `@repo/ui/{chart,editor,table}`                                |

Phases 7 and 9 ran in parallel with neighbours once their dependencies landed.

---

## Working agreement that still applies

The phase programme is over; these rules are how the repo continues to change:

- Every PR includes its tests and its documentation. Not a later cleanup pass.
- `make check` must pass. A change is not done until its behaviour is demonstrated.
- Deviations from the architecture produce an ADR, and the architecture document is updated in
  the same PR.
- No `TODO` without an issue reference. Unreferenced TODOs are permanent.
- The [acceptance operations](./01-principles-and-constraints.md#5-the-test-of-this-architecture)
  remain the test of whether a new feature is cheap to add. If it is not, the boundaries are
  wrong.
