import type { InvoiceStatus } from "@repo/contracts";

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

/** Formats minor units with `Intl.NumberFormat` (assumes 2 fraction digits). */
export function formatAmountMinor(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}
