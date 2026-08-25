import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { getBootstrappedFlags } from "../../server/flag-bootstrap.ts";
import { createServerCaller } from "../../server/router.ts";
import { SubscribeButton, SubscriptionActions } from "./subscription-actions.tsx";

type Props = {
  orgSlug: string;
};

export async function SubscriptionPanel({ orgSlug }: Props) {
  const flags = await getBootstrappedFlags();
  if (!flags["new-billing-portal"]) {
    return null;
  }

  const caller = await createServerCaller(orgSlug);
  const [catalog, subscription] = await Promise.all([
    caller.billing.catalog(),
    caller.billing.subscription(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Stripe Billing — checkout and customer portal.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {subscription === null ? (
          <p className="text-muted-foreground text-sm">No active subscription.</p>
        ) : (
          <p className="text-sm">
            Status: <strong>{subscription.status}</strong>
            {subscription.currentPeriodEnd === null
              ? null
              : ` · renews ${subscription.currentPeriodEnd}`}
          </p>
        )}

        <SubscriptionActions orgSlug={orgSlug} hasSubscription={subscription !== null} />

        <ul className="flex flex-col gap-2">
          {catalog.map((price) => (
            <li
              key={price.stripePriceId}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
            >
              <div>
                <p className="font-medium">{price.productName}</p>
                <p className="text-muted-foreground text-xs">
                  {price.unitAmountMinor === undefined
                    ? "—"
                    : `${(price.unitAmountMinor / 100).toFixed(2)} ${price.currency}`}
                  {price.interval === undefined ? "" : ` / ${price.interval}`}
                </p>
              </div>
              <SubscribeButton orgSlug={orgSlug} priceId={price.stripePriceId} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
