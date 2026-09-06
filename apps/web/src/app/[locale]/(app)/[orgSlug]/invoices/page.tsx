import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { InvoiceList } from "@/features/billing/invoice-list.tsx";
import { requireLocale } from "@/i18n/params.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale: requireLocale(locale), namespace: "Billing" });
  return { title: t("title") };
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { status: rawStatus } = await searchParams;

  const status =
    typeof rawStatus === "string" &&
    (rawStatus === "draft" || rawStatus === "open" || rawStatus === "paid" || rawStatus === "void")
      ? rawStatus
      : "all";

  return <InvoiceList orgSlug={orgSlug} status={status} />;
}
