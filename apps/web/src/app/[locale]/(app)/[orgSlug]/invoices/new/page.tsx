import { setRequestLocale } from "next-intl/server";

import { CreateInvoiceForm } from "../../../../../../features/billing/create-invoice-form.tsx";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function NewInvoicePage({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);

  return <CreateInvoiceForm orgSlug={orgSlug} />;
}
