import { setRequestLocale } from "next-intl/server";

import { InvoiceList } from "../../../../../features/billing/invoice-list.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function InvoicesPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);

  return <InvoiceList orgSlug={orgSlug} />;
}
