"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { useFlag } from "../../components/flags-provider.tsx";
import { useTRPC } from "../../trpc/react.ts";

type Props = {
  orgSlug: string;
};

export function SubscriptionPanel({ orgSlug }: Props) {
  const enabled = useFlag("new-billing-portal");
  const locale = useLocale();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const catalog = useQuery({
    ...trpc.billing.catalog.queryOptions(),
    enabled,
  });
  const subscription = useQuery({
    ...trpc.billing.subscription.queryOptions(),
    enabled,
  });

  const checkout = useMutation(
    trpc.billing.checkout.mutationOptions({
      onSuccess: (result) => {
        window.location.assign(result.url);
      },
    }),
  );

  const portal = useMutation(
    trpc.billing.portal.mutationOptions({
      onSuccess: (result) => {
        window.location.assign(result.url);
      },
    }),
  );

  const sync = useMutation(
    trpc.billing.syncCatalog.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.billing.catalog.pathFilter());
      },
    }),
  );

  if (!enabled) {
    return null;
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const successUrl = `${origin}/${locale}/${orgSlug}/billing?checkout=success`;
  const cancelUrl = `${origin}/${locale}/${orgSlug}/billing?checkout=cancel`;
  const returnUrl = `${origin}/${locale}/${orgSlug}/billing`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Stripe Billing — checkout and customer portal.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {subscription.data === null || subscription.data === undefined ? (
          <p className="text-muted-foreground text-sm">No active subscription.</p>
        ) : (
          <p className="text-sm">
            Status: <strong>{subscription.data.status}</strong>
            {subscription.data.currentPeriodEnd === null
              ? null
              : ` · renews ${subscription.data.currentPeriodEnd}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => {
              sync.mutate();
            }}
          >
            Sync catalog
          </Button>
          {subscription.data !== null && subscription.data !== undefined ? (
            <Button
              type="button"
              size="sm"
              disabled={portal.isPending}
              onClick={() => {
                portal.mutate({ returnUrl });
              }}
            >
              Manage billing
            </Button>
          ) : null}
        </div>

        <ul className="flex flex-col gap-2">
          {(catalog.data ?? []).map((price) => (
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
              <Button
                type="button"
                size="sm"
                disabled={checkout.isPending}
                onClick={() => {
                  checkout.mutate({
                    priceId: price.stripePriceId,
                    successUrl,
                    cancelUrl,
                  });
                }}
              >
                Subscribe
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
