/**
 * Locale-correct formatting via `Intl`.
 *
 * Shared by the web app and email templates so a price in an inbox matches the
 * price on the page. Arithmetic stays in `date-fns` (or the future Temporal);
 * formatting stays here so we do not ship locale data in a third-party library.
 */

import type { Locale } from "./locales.ts";

/** ISO 4217 currencies whose minor unit has zero decimal places. */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export type MoneyInput = {
  /** Integer minor units (cents, yen, …). */
  readonly amountMinor: number;
  /** ISO 4217 alphabetic code. */
  readonly currency: string;
};

/**
 * Formats minor-unit money for display.
 *
 * Converts to major units using the currency's decimal places (0 for JPY, 2 for
 * most others). Does not look up obscure ISO exceptions beyond the common zero-
 * decimal set — call sites dealing with those currencies should pass major units
 * through a dedicated path later if needed.
 */
export function formatMoney(value: MoneyInput, locale: Locale): string {
  const decimals = ZERO_DECIMAL.has(value.currency) ? 0 : 2;
  const amount = value.amountMinor / 10 ** decimals;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formats an RFC 3339 / ISO-8601 timestamp for display in `locale`.
 *
 * Accepts a string or a Date. Invalid input returns an empty string rather than
 * throwing — formatting sits at the edge of a render, and a bad timestamp should
 * not take down a page or an email send.
 */
export function formatDateTime(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Date-only formatting (no time component). */
export function formatDate(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return formatDateTime(value, locale, options);
}
