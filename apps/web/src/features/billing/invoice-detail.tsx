"use client";

import type { InvoiceId } from "@repo/types";
import { Badge, Button, Skeleton } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "../../i18n/navigation.ts";
import { formatAmountMinor, invoiceStatusBadgeVariant } from "./format-money.ts";
import { useInvoice, useVoidInvoice } from "./hooks.ts";

type Props = {
  orgSlug: string;
  invoiceId: InvoiceId;
};

export function InvoiceDetail({ orgSlug, invoiceId }: Props) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const { data: invoice, isPending, isError, error, refetch, isFetching } = useInvoice(invoiceId);
  const voidInvoice = useVoidInvoice();
  const [voidError, setVoidError] = useState<string | null>(null);

  async function onVoid() {
    if (invoice === undefined) return;
    setVoidError(null);
    try {
      await voidInvoice.mutateAsync({ invoiceId: invoice.id });
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : t("voidError"));
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  if (isError || invoice === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-destructive text-sm" role="alert">
          {error?.message ?? t("loadError")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
        >
          {t("retry")}
        </Button>
        <Link
          href={`/${orgSlug}/invoices`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>
    );
  }

  const canVoid = invoice.status === "draft" || invoice.status === "open";

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/${orgSlug}/invoices`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToList")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <Badge variant={invoiceStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-muted-foreground">{t("amount")}</dt>
        <dd className="tabular-nums">
          {formatAmountMinor(invoice.amountMinor, invoice.currency, locale)}
        </dd>
        <dt className="text-muted-foreground">{t("currency")}</dt>
        <dd>{invoice.currency}</dd>
        <dt className="text-muted-foreground">{t("createdAt")}</dt>
        <dd className="tabular-nums">
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(invoice.createdAt))}
        </dd>
      </dl>

      {canVoid ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={voidInvoice.isPending}
            onClick={() => {
              void onVoid();
            }}
          >
            {t("void")}
          </Button>
          {voidError ? (
            <p className="text-destructive text-sm" role="alert">
              {voidError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
