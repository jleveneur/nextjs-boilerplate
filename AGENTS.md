# AGENTS.md

Instructions for AI coding agents. Humans should read [`README.md`](README.md);
this is a condensed set of rules, not an explanation of why they exist.

---

## 1. Before you finish

```bash
pnpm check
```

Format check, type-aware lint, typecheck, Knip (dead code), React Doctor, and
unit tests. CI runs the same six plus `pnpm build`. If a failure looks
pre-existing, confirm that on a clean tree instead of assuming.

Faster individual loops: `pnpm format`, `pnpm lint`, `pnpm typecheck`,
`pnpm knip`, `pnpm react-doctor`, `pnpm test`.

Lefthook also runs formatting and syntax-only lint on commit, commitlint on the
message, and affected typecheck and tests on push. They are a convenience, not
the gate — do not treat a green hook as a substitute for `pnpm check`.

---

## 2. Repository shape

```
apps/web           Next.js application
packages/api       oRPC procedures and router
packages/auth      Better Auth server and client
packages/db        Drizzle schema, migrations, client
packages/env       Zod-validated environment
packages/ui        shadcn/ui components
tooling/*          Lint, Tailwind, and tsconfig configuration
scripts/           Repository setup scripts, run from package.json
```

The dependency direction is `env → db → auth → api → web`, with `ui` depending
on nothing internal. Keep it that way: a cycle between packages is a design
error, not something to work around with a re-export.

Internal packages ship TypeScript source with no build step. A package that
starts emitting declarations breaks the parallel `typecheck` in `turbo.json`.

---

## 3. Where logic goes

- **No database queries in a Route Handler or a Server Action.** They belong in
  an oRPC procedure, or in a function the procedure calls.
- **No business rules in a React component.** Components render state and raise
  events.
- **Every mutation scopes its query by the caller.** `eq(post.userId,
context.user.id)` is authorization; leaving it out is a data leak, not a bug.
- **`protectedProcedure` is how you require a session.** Do not re-derive it.

---

## 4. Non-negotiables

These fail `pnpm check`, so there is no version of "just for now":

- **No `any`.** Use `unknown` and narrow. No non-null assertions (`!`).
- **No unawaited promises.** A floating promise in a request handler is silent
  data loss.
- **No `console.log`.** `console.warn` and `console.error` are allowed.
- **No secrets in code, tests, or fixtures.**
- **No ad hoc `process.env` reads.** Add the variable to
  `packages/env/src/schema.ts` and import `env` from `@repo/env`, which t3-env
  validates at startup. The one exception is a process edge that runs before
  that module can load: `drizzle.config.ts` reads `DATABASE_URL` directly
  because it has to load the `.env` file first.
- **Validate every external input with Zod** at the boundary — oRPC inputs,
  webhook payloads, third-party responses.

---

## 5. Conventions

- Files and directories: `kebab-case`. Types and components: `PascalCase`.
  Functions and variables: `camelCase`.
- Tests sit beside the code as `*.test.ts`.
- Import internal packages by name (`@repo/db`), never by relative path across
  a package boundary. Inside `apps/web`, use the `@/` alias.
- Type-only imports use `import type`.
- Database columns are `snake_case`; TypeScript is `camelCase`. The mapping is
  explicit in the schema.
- React Server Components by default; `"use client"` only where interactivity
  requires it.

---

## 6. Adding a dependency

The bar is high and deliberate.

1. Check it is not already solved by something in the workspace.
2. Add it to the package that uses it — never to the root.
3. Use `catalog:` and add the version to `pnpm-workspace.yaml`.
4. Pin exact versions. No ranges — Renovate proposes the bumps.
5. Run `pnpm knip`. An unused dependency is a failing check, not a warning.

**This repository is a starter, and its scope is a feature.** Redis, object
storage, email, payments, queues, analytics, error tracking, feature flags,
internationalisation, and containers were all removed on purpose. Do not add
one back because a task seems to want it — say so and ask.

---

## 7. Working style

- **Prefer editing over adding.** A new file that overlaps an existing one is a
  future inconsistency.
- **Do not create documentation files** unless asked.
- **Do not weaken a check to make it pass.** Disabling a lint rule, loosening a
  type, or skipping a test needs its own justification. Fix the cause.
- **Verify behaviour by running something.** Reading code is a hypothesis; the
  test result is evidence.
- **Say what you are unsure about.**

---

## 8. Commits

[Conventional Commits](https://www.conventionalcommits.org):
`feat(scope): summary`, `fix(db): ...`, `chore(deps): ...`.
