import type { Invoice } from "@repo/contracts";
import { Badge } from "@repo/ui";
import { getTranslations } from "next-intl/server";

import { Link } from "../../i18n/navigation.ts";
import { formatAmountMinor, invoiceStatusBadgeVariant } from "./format-money.ts";
import { VoidInvoiceButton } from "./void-invoice-button.tsx";

type Props = {
  orgSlug: string;
  locale: string;
  invoice: Invoice;
  canVoid: boolean;
};

export async function InvoiceDetail({ orgSlug, locale, invoice, canVoid }: Props) {
  const t = await getTranslations("Billing");

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

      <VoidInvoiceButton invoiceId={invoice.id} canVoid={canVoid} />
    </div>
  );
}
