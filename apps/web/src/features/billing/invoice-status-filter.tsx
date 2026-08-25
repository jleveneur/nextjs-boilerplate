"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

export const INVOICE_STATUS_FILTERS = ["all", "draft", "open", "paid", "void"] as const;
export type InvoiceStatusFilter = (typeof INVOICE_STATUS_FILTERS)[number];

function isInvoiceStatusFilter(value: string): value is InvoiceStatusFilter {
  return (INVOICE_STATUS_FILTERS as readonly string[]).includes(value);
}

export function InvoiceStatusFilter() {
  const t = useTranslations("Billing");
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(INVOICE_STATUS_FILTERS).withDefault("all").withOptions({ shallow: false }),
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-muted-foreground text-sm" htmlFor="invoice-status-filter">
        {t("status")}
      </label>
      <Select
        value={status}
        onValueChange={(value) => {
          if (value === null || !isInvoiceStatusFilter(value)) return;
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
  );
}
