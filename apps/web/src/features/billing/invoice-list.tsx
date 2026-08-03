import type { InvoiceStatus } from "@repo/contracts";
import { Badge, Button } from "@repo/ui";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "../../i18n/navigation.ts";
import { getBootstrappedFlags } from "../../server/flag-bootstrap.ts";
import { createServerCaller } from "../../server/router.ts";
import { formatAmountMinor, invoiceStatusBadgeVariant } from "./format-money.ts";
import {
  InvoiceStatusFilter,
  type InvoiceStatusFilter as InvoiceStatusFilterValue,
} from "./invoice-status-filter.tsx";

type Props = {
  orgSlug: string;
  status: InvoiceStatusFilterValue;
};

export async function InvoiceList({ orgSlug, status }: Props) {
  const [t, locale, flags, caller] = await Promise.all([
    getTranslations("Billing"),
    getLocale(),
    getBootstrappedFlags(),
    createServerCaller(orgSlug),
  ]);
  const page = await caller.billing.list({ limit: 50 });
  const invoices = (() => {
    if (status === "all") return page.data;
    const statusFilter: InvoiceStatus = status;
    return page.data.filter((invoice) => invoice.status === statusFilter);
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button nativeButton={false} render={<Link href={`/${orgSlug}/invoices/new`} />}>
          {t("create")}
        </Button>
      </div>

      {flags["new-billing-portal"] ? (
        <p className="text-muted-foreground text-sm">
          {t("newPortalHint")}{" "}
          <Link className="underline" href={`/${orgSlug}/billing`}>
            Billing
          </Link>
        </p>
      ) : null}

      <InvoiceStatusFilter />

      {invoices.length === 0 ? <p className="text-muted-foreground text-sm">{t("empty")}</p> : null}

      {invoices.length > 0 ? (
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
