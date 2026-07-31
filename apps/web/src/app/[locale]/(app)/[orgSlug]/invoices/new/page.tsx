import { Suspense } from "react";

import { setRequestLocale } from "next-intl/server";
import { Skeleton } from "@repo/ui";

import { CreateInvoiceForm } from "../../../../../../features/billing/create-invoice-form.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default function NewInvoicePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}>
      <NewInvoiceContent params={params} />
    </Suspense>
  );
}

async function NewInvoiceContent({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);

  return <CreateInvoiceForm orgSlug={orgSlug} />;
}
