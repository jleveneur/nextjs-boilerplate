# 04 — Conventions

Convention over configuration only works if the conventions are written down and mechanically
checked. Anything in this document that a tool can enforce, a tool does enforce.

---

## 1. Naming

### Files and folders

| Kind                   | Convention                                                   | Example                          |
| ---------------------- | ------------------------------------------------------------ | -------------------------------- |
| All files and folders  | `kebab-case`                                                 | `organization-switcher.tsx`      |
| React components       | `kebab-case.tsx`, default-exported component in `PascalCase` | `user-avatar.tsx` → `UserAvatar` |
| Hooks                  | `use-*.ts`                                                   | `use-current-organization.ts`    |
| Core service           | `<feature>.service.ts`                                       | `billing.service.ts`             |
| Repository             | `<feature>.repository.ts`                                    | `billing.repository.ts`          |
| Policy                 | `<feature>.policy.ts`                                        | `billing.policy.ts`              |
| Contracts              | `<feature>.contract.ts`                                      | `billing.contract.ts`            |
| DB schema              | `<module>.sql.ts`                                            | `organization.sql.ts`            |
| Unit/integration tests | `*.test.ts`, colocated                                       | `billing.service.test.ts`        |
| E2E tests              | `*.spec.ts` in `e2e/`                                        | `e2e/checkout.spec.ts`           |
| Type-only modules      | `*.types.ts`                                                 | `pagination.types.ts`            |

`kebab-case` everywhere, including component files, because macOS and Windows are
case-insensitive while Linux CI is not — mixed-case filenames produce imports that work locally
and fail in CI. One rule, no exceptions, no class of bug.

### Code identifiers

| Kind                             | Convention                                                  | Notes                                                      |
| -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Types & interfaces               | `PascalCase`                                                | No `I` prefix, no `T` prefix                               |
| Type parameters                  | `TValue`, `TInput`                                          | Prefixed to distinguish from concrete types                |
| Functions & variables            | `camelCase`                                                 |                                                            |
| React components                 | `PascalCase`                                                |                                                            |
| Constants (module-level, frozen) | `SCREAMING_SNAKE_CASE`                                      | Only for true constants                                    |
| Zod schemas                      | `<Thing>Schema`                                             | `CreateInvoiceSchema`                                      |
| Inferred DTO types               | Same name without suffix                                    | `type CreateInvoice = z.infer<typeof CreateInvoiceSchema>` |
| Enums                            | Union of string literals, never `enum`                      | TS 7 + `erasableSyntaxOnly` bans `enum`                    |
| Booleans                         | `is*`, `has*`, `can*`, `should*`                            | `canEditInvoice`, not `editable`                           |
| Async functions                  | Verb phrase, no `Async` suffix                              | `fetchInvoice`, not `fetchInvoiceAsync`                    |
| Event names                      | `<aggregate>.<past-tense>`                                  | `invoice.paid`, `member.invited`                           |
| Job names                        | `<domain>.<action>`                                         | `email.send`, `image.derive`                               |
| Error codes                      | `SCREAMING_SNAKE_CASE`, stable forever                      | `INVOICE_ALREADY_PAID`                                     |
| Feature flags                    | `kebab-case`                                                | `new-billing-portal`                                       |
| Env vars                         | `SCREAMING_SNAKE_CASE`; client-visible ones `NEXT_PUBLIC_*` |                                                            |
| DB tables                        | `snake_case`, **singular**                                  | `organization_member`                                      |
| DB columns                       | `snake_case`; `*_id` for FKs; `*_at` for timestamps         | `created_at`                                               |

Singular table names because the table is a type (`OrganizationMember`) and it keeps join naming
symmetric. The important part is consistency; this is the coin-flip we have flipped.

### Import paths

| From                             | Use                                                        |
| -------------------------------- | ---------------------------------------------------------- |
| Another package                  | The package name: `@repo/contracts`                        |
| Within a package, across folders | `@/…` path alias (declared with `paths`, **no `baseUrl`**) |
| Within the same folder           | Relative `./`                                              |

`baseUrl` is banned: `oxlint`'s type-aware backend (tsgolint, built on typescript-go) does not
support `baseUrl` in `tsconfig.json`. `paths` without `baseUrl` resolves relative to the config
file and is fully supported, so this costs nothing.

---

## 2. TypeScript

### Compiler configuration

`tooling/typescript/base.json` sets, beyond `strict: true`:

| Option                               | Value      | Why                                                                                                  |
| ------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess`           | `true`     | `arr[0]` is `T \| undefined`, which is the truth                                                     |
| `exactOptionalPropertyTypes`         | `true`     | Distinguishes "absent" from "explicitly undefined"                                                   |
| `noImplicitOverride`                 | `true`     | Prevents silent override drift                                                                       |
| `noFallthroughCasesInSwitch`         | `true`     |                                                                                                      |
| `noPropertyAccessFromIndexSignature` | `true`     | Forces bracket access for dynamic keys                                                               |
| `verbatimModuleSyntax`               | `true`     | Import elision becomes predictable                                                                   |
| `erasableSyntaxOnly`                 | `true`     | Bans `enum`, namespaces, parameter properties — everything Node's native type stripping cannot erase |
| `moduleDetection`                    | `force`    | No accidental scripts in global scope                                                                |
| `module` / `moduleResolution`        | `nodenext` | Matches Node 24 and respects `exports` maps                                                          |
| `target`                             | `es2024`   | Node 24 supports it                                                                                  |
| `isolatedModules`                    | `true`     | Per-file transpilation safety                                                                        |
| `skipLibCheck`                       | `true`     | Pragmatic: third-party `.d.ts` errors are not ours to fix                                            |

`erasableSyntaxOnly` is more consequential than it looks: it guarantees every file can be
type-stripped rather than compiled, which is what keeps source-only internal packages viable
across Next, Vitest, and Node.

### Rules

- **No `any`.** Use `unknown` and narrow. Type-aware Oxlint rules (`no-unsafe-assignment`,
  `no-unsafe-argument`, `no-unsafe-return`, `no-explicit-any`) are errors.
- **No non-null `!`.** Use `invariant()` from `@repo/utils`, which throws a real error with a
  message instead of a `TypeError` three frames later.
- **No type assertions across unrelated types.** `as const` and narrowing assertions are fine;
  `as unknown as T` requires a comment justifying it and is treated as a code smell in review.
- **`type` over `interface`** except when declaration merging is genuinely needed (module
  augmentation).
- **Branded ids.** `type UserId = string & { readonly __brand: "UserId" }`. Passing an
  `OrganizationId` where a `UserId` belongs is one of the highest-frequency real bugs in
  multi-tenant systems, and branding turns it into a compile error for near-zero cost.
- **Return types are explicit on exported functions.** Inference is fine internally; exported
  surfaces should not change shape silently.
- **`readonly` by default** on arrays and object types in domain code.
- **No barrel files inside a package**, only the package root `index.ts`. Internal barrels create
  import cycles and defeat tree-shaking.

### Type-aware lint rules that matter most

`no-floating-promises` and `no-misused-promises` are the two rules that justify the whole
type-aware setup: an unawaited promise in a request handler is a silent data-loss bug, and no
syntax-only linter can see it.

---

## 3. Module conventions

### Every core feature exposes only services

`index.ts` re-exports the service functions, the feature's public contracts, and its error
classes. Repositories, policies, and mappers are private. If another feature needs a query, it
gets a service function — not the query.

### Function signature convention

Core services are `(ctx: Ctx, input: Input) => Promise<Output>`:

```
// illustrative
export async function createInvoice(ctx: Ctx, input: CreateInvoice): Promise<Invoice>
```

- `ctx` first, always. It carries the actor, adapters, logger, trace context, and an optional
  transaction.
- `input` is a single object, already parsed by the transport.
- Output is a DTO from `@repo/contracts`, never a raw database row. Mapping is explicit, so a new
  column cannot leak into an API response — which is how internal fields end up in public
  payloads.

### Ordering within a file

Imports (external, then internal, then relative — auto-sorted by Oxfmt), then types, then
constants, then the exported surface, then private helpers below their first use. Public before
private, so a reader sees the interface before the implementation.

### Comments

Comments explain **why**, never **what**. A comment restating the code is deleted in review.
Acceptable comments: non-obvious constraints, links to spec/issues, warnings about
counter-intuitive behaviour, and `TODO(username): …` with an issue reference.

JSDoc on exported functions where the signature is not self-evident, particularly documenting
which errors are thrown, since throw sites are not in the type signature.

---

## 4. React & Next.js conventions

- **Server Components by default.** `"use client"` requires a reason: interactivity, browser
  APIs, or a client-only library. It marks a boundary, so push it as far down the tree as
  possible — a `"use client"` at the top of a page ships the whole page to the browser.
- **Data fetching:** RSC for initial render; TanStack Query via oRPC for anything interactive,
  paginated, or refetched. Do not fetch in `useEffect`.
- **Mutations:** oRPC mutations for app interactions; Server Actions for progressively-enhanced
  forms. Both delegate to `@repo/core` and both revalidate explicitly.
- **Caching is explicit.** With `cacheComponents: true`, `use cache` is opt-in per boundary with
  a declared `cacheLife`, and invalidation uses tags (`revalidateTag(tag, profile)` for SWR
  semantics, `updateTag(tag)` inside Actions for read-your-writes). Cache decisions are commented
  with _why_ that lifetime.
- **Loading and error states are required**, not optional: every route segment that suspends has
  `loading.tsx`, every one that can fail has `error.tsx`. Skeletons match final layout to avoid
  shift.
- **Forms:** React Hook Form + `zodResolver` over a schema derived from `@repo/contracts`, so
  client validation and server validation cannot disagree. The server always re-validates.
- **Keys:** stable entity ids, never array index.
- **No `useEffect` for derived state.** Derive during render or use `useMemo`.
- **Accessibility is a requirement.** Semantic elements, labelled controls, visible focus,
  keyboard operability. Base UI primitives handle most of it; axe checks the rest in CI.

### Styling

- Tailwind utilities in JSX. No CSS modules, no `styled-components`, no `@apply` beyond a handful
  of base layer primitives.
- **Design tokens, not raw values.** `bg-surface`, `text-muted-foreground` — never
  `bg-[#0f172a]`. Tokens live in `tooling/tailwind` as CSS variables (Tailwind 4 CSS-first
  config) so theming and dark mode are token swaps.
- Variants via `cva`-style helpers in `@repo/ui`; conditional classes via `cn()`.
- Class order is enforced by Oxfmt's built-in Tailwind class sorting (which is why
  `prettier-plugin-tailwindcss` is not needed).
- No arbitrary z-index: a token scale in the theme.

---

## 5. Database conventions

| Rule          | Detail                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Primary keys  | UUIDv7 (`id`), time-sortable for index locality without exposing sequence counts                      |
| Timestamps    | `timestamptz` always; `created_at` and `updated_at` on every table                                    |
| Soft delete   | `deleted_at`, only where genuinely required; hard delete otherwise                                    |
| Tenant column | `organization_id` on every tenant-scoped table, in the leading position of its composite indexes      |
| Foreign keys  | Always declared, with explicit `ON DELETE` intent                                                     |
| Booleans      | `is_*` / `has_*`, `NOT NULL` with a default                                                           |
| Money         | Integer minor units + a currency column. Never floats.                                                |
| Enums         | Postgres `text` + a `CHECK` constraint, mirrored by a Zod enum. Native PG enums are painful to alter. |
| JSON          | `jsonb`, always with a Zod schema at the boundary                                                     |
| Index naming  | `idx_<table>__<cols>`; unique `uq_<table>__<cols>`                                                    |
| Schema files  | One per module in `packages/db/src/schema/`, aggregated by an index                                   |

---

## 6. API conventions

Detailed in [05](./05-runtime-and-api.md); the naming rules:

- REST paths: plural nouns, kebab-case, no verbs — `/v1/organizations/{orgId}/invoices`.
- Actions that are not CRUD: a sub-resource — `POST /v1/invoices/{id}/void`.
- Query params: `snake_case` (REST public surface), consistent with the JSON body casing choice
  below.
- JSON bodies: `snake_case` on the public REST surface (conventional for public APIs, and stable
  regardless of internal renames); `camelCase` internally over oRPC. The mapping happens in one
  place, the REST serializer.
- Pagination: cursor-based (`?limit=&cursor=`), returning `{ data, next_cursor }`. Offset
  pagination is not offered — it produces duplicates and skips under concurrent writes.
- Timestamps: RFC 3339 UTC strings.
- Errors: RFC 9457 `application/problem+json` with a stable `code`.
- Every mutating endpoint accepts `Idempotency-Key`.

---

## 7. Commits, branches, PRs

**Conventional Commits**, enforced by commitlint:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`.
Scopes are package or app names without the prefix: `web`, `api`, `core`, `db`, `ui`, `infra`,
`deps`.

Subject: imperative mood, lower case, no trailing period, ≤ 72 chars.
Breaking changes: `!` after the scope plus a `BREAKING CHANGE:` footer.

Branches: `<type>/<short-description>` (`feat/invoice-void`). Trunk-based, short-lived, squash
merged, so the branch name matters far less than the resulting commit message.

PRs: title follows Conventional Commits (it becomes the squash commit). The template requires
what the change does, why, how it was verified, and a changeset when a package's public surface
changed.

---

## 8. Tooling configuration summary

| Tool          | Config                                      | Notes                                                                                                                             |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Oxlint        | `.oxlintrc.json` extending `tooling/oxlint` | `typeAware: true` at root; correctness rules are errors; per-layer overrides (e.g. `no-console` off in `apps/worker` bootstrap)   |
| Oxfmt         | `.oxfmtrc.json`                             | `printWidth: 100` (Oxfmt's default), double quotes, semicolons, trailing commas, import sorting + Tailwind class sorting built in |
| CSpell        | `cspell.config.yaml`                        | Project dictionary committed so new jargon is a reviewed diff                                                                     |
| Knip          | `knip.json`                                 | Fails CI on unused files, exports, and dependencies                                                                               |
| Lefthook      | `lefthook.yml`                              | pre-commit: format + lint staged, gitleaks. pre-push: typecheck + affected unit tests                                             |
| EditorConfig  | `.editorconfig`                             | LF, UTF-8, 2 spaces, final newline, trim trailing whitespace                                                                      |
| gitattributes | `.gitattributes`                            | `* text=auto eol=lf`, lockfile marked binary-ish for diffs, `linguist-generated` on generated files                               |

### Git hooks: deliberately fast

Pre-commit runs only formatting, lint on staged files, and secret scanning — sub-second work.
Pre-push adds typecheck and affected unit tests. Integration and E2E tests are **never** in
hooks: slow hooks get bypassed with `--no-verify`, and a bypassed hook protects nothing. CI is
the real gate; hooks exist to catch the trivial cases before they cost a CI cycle.
