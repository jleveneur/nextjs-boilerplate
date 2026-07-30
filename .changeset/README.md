# Changesets

A changeset is a small Markdown file recording **what changed and why it matters
to someone else**. It is written by the author, reviewed with the code, and later
compiled into changelogs and version bumps.

Full strategy: [docs/architecture/12-git-ci-release.md](../docs/architecture/12-git-ci-release.md).

## Adding one

```bash
pnpm changeset
```

Pick the affected packages, pick a bump, and describe the change for a reader who
was not in the review. `pnpm changeset:status` lists what is pending.

## When one is required

| Change                                     | Changeset |
| ------------------------------------------ | --------- |
| Behaviour or API of a `packages/*` package | Yes       |
| Bug fix in a `packages/*` package          | Yes       |
| App-only change (`apps/*`)                 | No        |
| Docs, tests, CI, tooling, formatting       | No        |

Apps are excluded on purpose: they are deployed as immutable image tags rather
than semver artifacts, so a version number would be a second, less trustworthy
source of truth about what is running.

## Choosing a bump

Every package here is private and consumed through the workspace, so semver is
communication rather than a registry contract:

- **major** — a consumer must change code to upgrade.
- **minor** — new capability, existing callers unaffected.
- **patch** — fix or internal change, no API movement.

## Why the config looks like this

- **`privatePackages: { version: true, tag: false }`** — nothing is published, so
  versions and changelogs are still generated but no git tags are created. Tags
  belong to deployable apps.
- **`commit: false`** — the release workflow opens a version PR instead of pushing
  a bump commit, so releases stay reviewable and never mix into a feature commit.
- **`updateInternalDependencies: "patch"`** — a fix in a low layer shows up in the
  changelog of everything that ships it, which is how a consumer finds out they
  picked up a change they did not make.
- **`fixed` / `linked` empty** — both couple version numbers across packages,
  trading independent cadence for tidier numbers. Not a worthwhile trade while
  every package is internal.
