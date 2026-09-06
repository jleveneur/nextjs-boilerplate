import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { invoiceIdSchema } from "@repo/contracts";
import { canVoidInvoice } from "@repo/core";

import { InvoiceDetail } from "@/features/billing/invoice-detail.tsx";
import { requireLocale } from "@/i18n/params.ts";
import { createServerCaller } from "@/server/router.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; invoiceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale: requireLocale(locale), namespace: "Billing" });
  return { title: t("title") };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, orgSlug, invoiceId } = await params;

  const parsed = invoiceIdSchema.safeParse(invoiceId);
  if (!parsed.success) {
    notFound();
  }

  const { api, actor } = await createServerCaller(orgSlug);
  const invoice = await api.billing.get({ invoiceId: parsed.data });
  const canVoid = actor !== null && canVoidInvoice(actor, invoice).allowed;

  return <InvoiceDetail orgSlug={orgSlug} locale={locale} invoice={invoice} canVoid={canVoid} />;
}
