import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { invoiceIdSchema } from "@repo/contracts";
import { canVoidInvoice } from "@repo/core";
import { createCallerFactory } from "@repo/orpc";

import { InvoiceDetail } from "@/features/billing/invoice-detail.tsx";
import { createOrpcContext } from "@/server/context.ts";
import { reportCallerFailure } from "@/server/report-caller-failure.ts";
import { appRouter } from "@/server/router.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string; invoiceId: string }>;
};

const createCaller = createCallerFactory(appRouter, reportCallerFailure);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Billing" });
  return { title: t("title") };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, orgSlug, invoiceId } = await params;

  const parsed = invoiceIdSchema.safeParse(invoiceId);
  if (!parsed.success) {
    notFound();
  }

  const context = await createOrpcContext(await headers(), { organizationSlug: orgSlug });
  const invoice = await createCaller(context).billing.get({ invoiceId: parsed.data });
  const canVoid = context.actor !== null && canVoidInvoice(context.actor, invoice).allowed;

  return <InvoiceDetail orgSlug={orgSlug} locale={locale} invoice={invoice} canVoid={canVoid} />;
}
