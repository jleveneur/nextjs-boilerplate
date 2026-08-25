"use client";

import { Button } from "@repo/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { useRouter } from "../../i18n/navigation.ts";
import { useTRPC } from "../../trpc/react.ts";

type SubscriptionActionsProps = {
  orgSlug: string;
  hasSubscription: boolean;
};

export function SubscriptionActions({ orgSlug, hasSubscription }: SubscriptionActionsProps) {
  const locale = useLocale();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

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
        router.refresh();
      },
    }),
  );

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const returnUrl = `${origin}/${locale}/${orgSlug}/billing`;

  return (
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
      {hasSubscription ? (
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
  );
}

type SubscribeButtonProps = {
  orgSlug: string;
  priceId: string;
};

export function SubscribeButton({ orgSlug, priceId }: SubscribeButtonProps) {
  const locale = useLocale();
  const trpc = useTRPC();
  const checkout = useMutation(
    trpc.billing.checkout.mutationOptions({
      onSuccess: (result) => {
        window.location.assign(result.url);
      },
    }),
  );

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const successUrl = `${origin}/${locale}/${orgSlug}/billing?checkout=success`;
  const cancelUrl = `${origin}/${locale}/${orgSlug}/billing?checkout=cancel`;

  return (
    <Button
      type="button"
      size="sm"
      disabled={checkout.isPending}
      onClick={() => {
        checkout.mutate({ priceId, successUrl, cancelUrl });
      }}
    >
      Subscribe
    </Button>
  );
}
