# `@repo/payments`

Stripe Billing adapter (layer 1, `runtime: node`). Implements the `PaymentGateway` shape used by
`@repo/core` — Checkout (`mode: subscription`), Customer Portal, catalog list, webhook verify, and
subscription → entitlement mapping.

## Local webhook drill

```bash
# Terminal A — API
pnpm --filter api dev

# Terminal B — Stripe CLI
stripe listen --forward-to localhost:3001/webhooks/stripe
# paste the whsec_… into STRIPE_WEBHOOK_SECRET

# Terminal C — worker
pnpm --filter worker dev
```

Price metadata key `entitlements` is a comma-separated list of feature keys written to the
`entitlement` table on subscription upsert.
