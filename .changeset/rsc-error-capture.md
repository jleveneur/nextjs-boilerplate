---
"@repo/orpc": minor
---

`createCallerFactory` takes an optional failure reporter.

Server Components call services through the in-process caller, which never touches
the `/api/rpc` route and its interceptor. Their failures surfaced as a rendered
`error.tsx` and nothing else — no log line, no tracker event. The hook runs the same
`describeRpcFailure` policy as the RPC route, so the two entry points cannot disagree
about what counts as an incident.

Optional: existing callers, including tests, keep working unchanged.
