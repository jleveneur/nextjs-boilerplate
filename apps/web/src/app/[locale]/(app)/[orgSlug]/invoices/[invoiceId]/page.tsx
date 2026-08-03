import { Suspense } from "react";

import { invoiceIdSchema } from "@repo/contracts";
import { canVoidInvoice } from "@repo/core";
import { createCallerFactory } from "@repo/trpc";
import { Skeleton } from "@repo/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InvoiceDetail } from "../../../../../../features/billing/invoice-detail.tsx";
import { createTrpcContext } from "../../../../../../server/context.ts";
import { appRouter } from "../../../../../../server/router.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; invoiceId: string }>;
};

const createCaller = createCallerFactory(appRouter);

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

  const context = await createTrpcContext(await headers());
  const invoice = await createCaller(context).billing.get({ invoiceId: parsed.data });
  const canVoid = context.actor !== null && canVoidInvoice(context.actor, invoice).allowed;

  return <InvoiceDetail orgSlug={orgSlug} locale={locale} invoice={invoice} canVoid={canVoid} />;
}
