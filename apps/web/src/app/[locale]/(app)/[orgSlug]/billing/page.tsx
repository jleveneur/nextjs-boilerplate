import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SubscriptionPanel } from "@/features/billing/subscription-panel.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Billing" });
  return { title: t("portalTitle") };
}

export default async function BillingPage({ params }: Props) {
  const { orgSlug } = await params;
  const t = await getTranslations("Billing");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("portalTitle")}</h1>
      <SubscriptionPanel orgSlug={orgSlug} />
    </div>
  );
}
