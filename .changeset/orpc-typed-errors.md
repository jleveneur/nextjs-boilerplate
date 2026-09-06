---
"@repo/orpc": minor
---

`billing.void` declares a typed error contract: `CONFLICT` with `data.appCode`
narrowed to the refusals a caller can act on (`INVOICE_ALREADY_PAID`,
`INVOICE_ALREADY_VOID`).

`appCode` was already on the wire but untyped, so no client could branch on it
without matching message text. The oRPC code stays `CONFLICT` rather than becoming
the domain code: a custom code is absent from `COMMON_ERROR_STATUS_MAP` and the
response would lose its 409.
