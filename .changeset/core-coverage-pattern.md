---
---

No release. `@repo/core` changed, but only its Vitest coverage exclusions: repositories
and mappers are now matched by pattern instead of listed one line per slice. No runtime
code, no public API, nothing for a consumer to act on.

Recorded rather than skipped because `changeset status` sees the package as touched, and
an unexplained bypass is worse than an empty entry.
