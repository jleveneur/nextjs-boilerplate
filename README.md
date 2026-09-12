# Next.js monorepo starter

A minimal, production-ready foundation. It has the pieces every project needs
and nothing that only some projects need.

- **[Next.js](https://nextjs.org)** (App Router) and **TypeScript**
- **[Turborepo](https://turborepo.com)** + **pnpm** workspaces
- **[Oxlint + Oxfmt](https://oxc.rs)** for linting and formatting
- **[Tailwind CSS](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)**
- **[Drizzle ORM](https://orm.drizzle.team)** + PostgreSQL
- **[oRPC](https://orpc.unnoq.com)** for the typed API
- **[Better Auth](https://better-auth.com)** for email/password sign-in, organizations, and
  role-based permissions
- **[t3-env](https://env.t3.gg)** + **[Zod](https://zod.dev)** for validated configuration
- **[Vitest](https://vitest.dev)** and a single GitHub Actions workflow
- **[Lefthook](https://lefthook.dev)** + **[commitlint](https://commitlint.js.org)** git hooks,
  **[Knip](https://knip.dev)** for dead code, **[React Doctor](https://react.doctor)** for React
  diagnostics, and **[Renovate](https://docs.renovatebot.com)** for dependency updates

## Getting started

```bash
pnpm install
cp .env.example .env      # then edit DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate           # apply migrations to your database
pnpm dev                  # http://localhost:3000
```

You need a PostgreSQL 13 or newer database reachable at `DATABASE_URL`. How you
run it — a local install, a container, a hosted instance — is deliberately not
this repository's business.

## Layout

```
apps/
  web/            Next.js application
packages/
  api/            oRPC procedures and router          @repo/api
  auth/           Better Auth server and client       @repo/auth
  authz/          Organization roles and permissions  @repo/authz
  db/             Drizzle schema, migrations, client  @repo/db
  env/            Zod-validated environment           @repo/env
  ui/             shadcn/ui components                @repo/ui
tooling/
  oxlint/         Shared lint rules
  tailwind/       Shared design tokens
  typescript/     Shared tsconfig bases
```

Internal packages ship TypeScript source and are never built. Next compiles
them through `transpilePackages`; Vitest and `tsc` read them directly.

## Conventions

- **Files and directories are `kebab-case`.** Types and components are
  `PascalCase`; functions and variables are `camelCase`.
- **Tests sit beside the code** as `*.test.ts`.
- **Import internal packages by name** (`@repo/db`), never by relative path
  across a package boundary. Inside `apps/web`, use the `@/` alias.
- **Type-only imports use `import type`.** `verbatimModuleSyntax` is on, so
  what you write is what is emitted.
- **Database columns are `snake_case`**, TypeScript is `camelCase`, and the
  mapping is explicit in `packages/db/src/schema.ts`.
- **Validate external input with Zod** at the boundary — that means every oRPC
  procedure `.input()` and the environment.
- **Business logic does not live in a transport.** An oRPC procedure or a Route
  Handler translates; when a handler grows past a query and a rule, move the
  body into a function it calls.
- **Server Components by default.** Add `"use client"` only where interactivity
  requires it.

## Commands

| Command                     | What it does                                      |
| --------------------------- | ------------------------------------------------- |
| `pnpm dev`                  | Next dev server                                   |
| `pnpm build`                | Production build                                  |
| `pnpm check`                | The full local gate — everything below plus tests |
| `pnpm lint` / `pnpm format` | Oxlint (type-aware) / Oxfmt                       |
| `pnpm typecheck`            | `tsc --noEmit` in every package                   |
| `pnpm knip`                 | Unused files, exports, and dependencies           |
| `pnpm react-doctor`         | React and accessibility diagnostics               |
| `pnpm test`                 | Vitest                                            |
| `pnpm db:generate`          | Generate a migration from `schema.ts`             |
| `pnpm db:migrate`           | Apply pending migrations                          |
| `pnpm db:studio`            | Drizzle Studio                                    |

## Organizations and permissions

Every user gets a personal organization the first time they sign in, and every
session starts inside one. That is the tenant boundary: `post` carries an
`organization_id`, and every query filters on it.

Roles and what they grant live in one file, `packages/authz/src/index.ts`:

```ts
export const statement = {
  ...defaultStatements, // organization, member, invitation
  post: ["create", "delete"], // your resources go here
} as const;
```

Procedures compose the guarantee rather than restating it:

| Builder                                   | Guarantees                         |
| ----------------------------------------- | ---------------------------------- |
| `publicProcedure`                         | nothing                            |
| `protectedProcedure`                      | a signed-in `context.user`         |
| `orgProcedure`                            | an active `context.organizationId` |
| `requirePermission({ post: ["delete"] })` | the caller's role grants it        |

The browser gets the same role definitions, so `checkRolePermission` can hide a
control the user cannot use — but that is cosmetic. The server checks again on
every call, and a mutation is scoped by `organizationId` as well, so an admin
of one tenant cannot reach another tenant's row by guessing an id.

Users can create organizations and switch between them from the dashboard.
Those two actions call `authClient.organization.*` rather than the oRPC router,
because both change the session and only Better Auth's own route can hand the
browser the refreshed session cookie — proxied through another endpoint, the
cookie cache keeps serving the previous organization for minutes. A
session-update hook mirrors the choice onto the user row, so it also survives
signing out.

Inviting members works through Better Auth's API; nothing emails the invitation
link, because there is no mail transport here. Add `sendInvitationEmail` when
you add one.

## Testing

Two suites, split by what they need.

`pnpm test` is pure logic — environment rules, role grants, procedure guards.
It runs in under a second and needs nothing.

`pnpm test:integration` is the seam the first suite cannot reach: Better Auth
writing through the Drizzle adapter, the session hook resolving an
organization, and a permission check reading the member row it just wrote.
That wiring is what an upstream version bump breaks silently, and no amount of
typechecking sees it. It needs a database with migrations applied:

```bash
pnpm db:migrate && pnpm test:integration
```

CI runs it against a Postgres service container.

## Git hooks

Lefthook installs three hooks on `pnpm install`, kept fast enough that nobody
reaches for `--no-verify`:

- **pre-commit** — Oxfmt on staged files (fixes are re-staged) and syntax-only
  Oxlint.
- **commit-msg** — commitlint, so the history stays
  [Conventional](https://www.conventionalcommits.org).
- **pre-push** — typecheck and tests, for affected packages only.

Type-aware lint, Knip, and React Doctor need the whole program, so they live in
`pnpm check` and CI rather than in a per-file hook.

## Environment

One `.env` at the repository root, for the whole workspace. `next.config.ts`
and `drizzle.config.ts` load it with Node's built-in `process.loadEnvFile`; in
production you set real environment variables and no file is read.

Variables are declared once, in `packages/env/src/schema.ts`, and validated by
[t3-env](https://env.t3.gg) when the process starts — so a missing secret is a
boot failure listing every problem at once, not a 500 on the first request that
needs it.

To add one, put it in the `server` object and import `env` from `@repo/env`.
Browser variables go in the `client` object, must start with `NEXT_PUBLIC_`,
and have to be destructured in `experimental__runtimeEnv` — Next only inlines
`process.env.NEXT_PUBLIC_FOO` where it is written out literally. t3-env throws
if server configuration is ever read from browser code, so a secret cannot
reach the client through an import nobody noticed.

## Adding UI components

Components live in `@repo/ui` and come from the shadcn registry:

```bash
cd packages/ui && pnpm dlx shadcn@latest add dialog
```

The starter ships only `Button`, `Card`, `Input`, and `Label` — add the rest as
you need them.

## What is deliberately missing

No Redis, object storage, payments, queues, analytics, error tracking, feature
flags, internationalisation, containers, or browser test harness.

**No email transport**, which is the one worth calling out: it means no address
verification, no password reset, and no invitation emails. Every real product
needs those on day one. They are absent because the choice of provider is
yours, not because they are optional — wire a transport, then turn on
`requireEmailVerification` and `sendInvitationEmail`.
Each of those is a real decision with real trade-offs, and a starter that makes
them for you is a starter you spend your first day deleting.

The one thing that _is_ here for illustration is the `post` table and its
router. Delete both when you add a real domain.
