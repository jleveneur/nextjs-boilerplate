---
"@repo/env": minor
---

Harden `createEnv`: exhaustive `runtimeEnv` maps, empty strings as unset, type-level `NEXT_PUBLIC_` keys, preset-owned pairing rules, parsed `FLAGS_JSON`, and staging as a production-strict environment.
