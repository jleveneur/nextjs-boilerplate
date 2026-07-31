import { Suspense } from "react";

import { invoiceIdSchema } from "@repo/contracts";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Skeleton } from "@repo/ui";

import { InvoiceDetail } from "../../../../../../features/billing/invoice-detail.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; invoiceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Billing" });
  return { title: t("title") };
}

export default function InvoiceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InvoiceDetailContent params={params} />
    </Suspense>
  );
}

async function InvoiceDetailContent({ params }: Props) {
  const { locale, orgSlug, invoiceId } = await params;
  setRequestLocale(locale);

  const parsed = invoiceIdSchema.safeParse(invoiceId);
  if (!parsed.success) {
    notFound();
  }

  return <InvoiceDetail orgSlug={orgSlug} invoiceId={parsed.data} />;
}
