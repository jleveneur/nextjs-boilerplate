import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { createServerCaller } from "@/server/router.ts";

import { SubscribeButton, SubscriptionActions } from "./subscription-actions.tsx";

type Props = {
  orgSlug: string;
};

export async function SubscriptionPanel({ orgSlug }: Props) {
  const t = await getTranslations("Billing");
  const { api } = await createServerCaller(orgSlug);
  const [catalog, subscription] = await Promise.all([
    api.billing.catalog(),
    api.billing.subscription(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("subscriptionTitle")}</CardTitle>
        <CardDescription>{t("subscriptionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {subscription === null ? (
          <p className="text-muted-foreground text-sm">{t("noSubscription")}</p>
        ) : (
          <p className="text-sm">
            {t("status")}: <strong>{subscription.status}</strong>
            {subscription.currentPeriodEnd === null
              ? null
              : ` · ${t("renews")} ${subscription.currentPeriodEnd}`}
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
