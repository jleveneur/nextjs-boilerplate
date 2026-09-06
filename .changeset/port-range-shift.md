---
---

No release. Four `packages/*` files changed, none of them behaviour:

- `email/smtp-mailer.ts` — the example URL in a JSDoc comment
- `db/drizzle.config.ts` — the local fallback URL drizzle-kit uses when
  `DATABASE_URL` is unset, which has to follow the compose stack it points at
- two test files asserting on those ports

The host ports moved from 554xx to 154xx to get out of the kernel's ephemeral
range; nothing a consumer of these packages can observe.
