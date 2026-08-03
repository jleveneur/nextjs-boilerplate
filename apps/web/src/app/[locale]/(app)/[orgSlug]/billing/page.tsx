import { Suspense } from "react";

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Skeleton } from "@repo/ui";

import { SubscriptionPanel } from "../../../../../features/billing/subscription-panel.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export function generateMetadata(): Metadata {
  return { title: "Billing" };
}

export default function BillingPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <BillingContent params={params} />
    </Suspense>
  );
}

async function BillingContent({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <SubscriptionPanel orgSlug={orgSlug} />
    </div>
  );
}
