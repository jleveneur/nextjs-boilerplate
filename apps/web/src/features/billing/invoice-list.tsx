"use client";

import type { InvoiceStatus } from "@repo/contracts";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";

import { useFlag } from "../../components/flags-provider.tsx";
import { Link } from "../../i18n/navigation.ts";
import { formatAmountMinor, invoiceStatusBadgeVariant } from "./format-money.ts";
import { useInvoiceList } from "./hooks.ts";

const STATUS_FILTERS = ["all", "draft", "open", "paid", "void"] as const;

function isStatusFilter(value: string): value is (typeof STATUS_FILTERS)[number] {
  return (STATUS_FILTERS as readonly string[]).includes(value);
}

type Props = {
  orgSlug: string;
};

export function InvoiceList({ orgSlug }: Props) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const newBillingPortal = useFlag("new-billing-portal");
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_FILTERS).withDefault("all"),
  );

  const { data, isPending, isError, error, refetch, isFetching } = useInvoiceList({ limit: 50 });

  const invoices = useMemo(() => {
    const rows = data?.data ?? [];
    if (status === "all") return rows;
    const statusFilter: InvoiceStatus = status;
    return rows.filter((invoice) => invoice.status === statusFilter);
  }, [data?.data, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button nativeButton={false} render={<Link href={`/${orgSlug}/invoices/new`} />}>
          {t("create")}
        </Button>
      </div>

      {newBillingPortal ? (
        <p className="text-muted-foreground text-sm">{t("newPortalHint")}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-muted-foreground text-sm" htmlFor="invoice-status-filter">
          {t("status")}
        </label>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === null || !isStatusFilter(value)) return;
            void setStatus(value);
          }}
        >
          <SelectTrigger id="invoice-status-filter" className="w-40" aria-label={t("status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusAll")}</SelectItem>
            <SelectItem value="draft">{t("statusDraft")}</SelectItem>
            <SelectItem value="open">{t("statusOpen")}</SelectItem>
            <SelectItem value="paid">{t("statusPaid")}</SelectItem>
            <SelectItem value="void">{t("statusVoid")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col gap-2">
          <p className="text-destructive text-sm" role="alert">
            {error.message || t("loadError")}
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
        </div>
      ) : null}

      {!isPending && !isError && invoices.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : null}

      {!isPending && !isError && invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-lg text-left text-sm">
            <thead className="border-border text-muted-foreground border-b">
              <tr>
                <th className="px-2 py-2 font-medium">{t("number")}</th>
                <th className="px-2 py-2 font-medium">{t("status")}</th>
                <th className="px-2 py-2 font-medium">{t("amount")}</th>
                <th className="px-2 py-2 font-medium">{t("createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-border border-b last:border-0">
                  <td className="px-2 py-3">
                    <Link
                      href={`/${orgSlug}/invoices/${invoice.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <Badge variant={invoiceStatusBadgeVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 tabular-nums">
                    {formatAmountMinor(invoice.amountMinor, invoice.currency, locale)}
                  </td>
                  <td className="text-muted-foreground px-2 py-3 tabular-nums">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(invoice.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
