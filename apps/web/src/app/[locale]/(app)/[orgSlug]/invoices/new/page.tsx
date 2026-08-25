import { Suspense } from "react";

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Skeleton } from "@repo/ui";

import { CreateInvoiceForm } from "../../../../../../features/billing/create-invoice-form.tsx";
import { Link } from "../../../../../../i18n/navigation.ts";

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
  const t = await getTranslations("Billing");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("create")}</h1>
        <Link
          href={`/${orgSlug}/invoices`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>
      <CreateInvoiceForm orgSlug={orgSlug} />
    </div>
  );
}
