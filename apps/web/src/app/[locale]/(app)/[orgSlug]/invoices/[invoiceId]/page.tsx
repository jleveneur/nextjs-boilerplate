import { invoiceIdSchema } from "@repo/contracts";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InvoiceDetail } from "../../../../../../features/billing/invoice-detail.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; invoiceId: string }>;
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, orgSlug, invoiceId } = await params;
  setRequestLocale(locale);

  const parsed = invoiceIdSchema.safeParse(invoiceId);
  if (!parsed.success) {
    notFound();
  }

  return <InvoiceDetail orgSlug={orgSlug} invoiceId={parsed.data} />;
}
