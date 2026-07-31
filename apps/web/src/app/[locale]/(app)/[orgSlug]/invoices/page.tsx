import { Suspense } from "react";

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Skeleton } from "@repo/ui";

import { InvoiceList } from "../../../../../features/billing/invoice-list.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Billing" });
  return { title: t("title") };
}

export default function InvoicesPage({ params }: Props) {
  return (
    <Suspense fallback={<InvoiceListFallback />}>
      <InvoicesContent params={params} />
    </Suspense>
  );
}

async function InvoicesContent({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);

  // Client island: nuqs filters + TanStack Query over tRPC (request-dynamic).
  return <InvoiceList orgSlug={orgSlug} />;
}

function InvoiceListFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
