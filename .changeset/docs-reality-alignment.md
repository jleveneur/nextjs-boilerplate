---
"@repo/db": patch
"@repo/env": patch
---

Correct package documentation to describe current behaviour: `createEnv` is a server-side `process.env` fallback rather than the repository's sole reader, and the audit-log table has no application writers wired yet.
