import type { InvoiceStatus } from "@repo/contracts";
import { defaultLocale, formatDate, formatDateTime, isLocale, type Locale } from "@repo/i18n";

const STATUS_BADGE_VARIANT = {
  draft: "secondary",
  open: "default",
  paid: "outline",
  void: "destructive",
} as const;

export function invoiceStatusBadgeVariant(
  status: InvoiceStatus,
): (typeof STATUS_BADGE_VARIANT)[InvoiceStatus] {
  return STATUS_BADGE_VARIANT[status];
}

function billingLocale(locale: string): Locale {
  return isLocale(locale) ? locale : defaultLocale;
}

/** Formats minor units with `Intl.NumberFormat` (assumes 2 fraction digits). */
export function formatAmountMinor(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

/** Date-only invoice timestamp for list views. */
export function formatInvoiceDate(iso: string, locale: string): string {
  return formatDate(iso, billingLocale(locale));
}

/** Date and time for invoice detail. */
export function formatInvoiceDateTime(iso: string, locale: string): string {
  return formatDateTime(iso, billingLocale(locale));
}
