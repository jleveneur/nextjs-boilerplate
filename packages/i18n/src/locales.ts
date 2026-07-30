/**
 * Supported locales.
 *
 * The list is the product decision; everything else (routing, message loading,
 * formatting) derives from it. Adding a locale means adding it here, then
 * adding a message catalog in each app that ships UI — never the other way
 * around, or routing and formatting drift from what translators can provide.
 *
 * Message catalogs themselves do **not** live in this package. They belong to
 * the app that renders them (`apps/web/messages/…`), so a docs site and the
 * product UI can diverge without forcing a shared catalog of unused keys.
 */

export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

/** Fallback when the request carries no locale (or an unsupported one). */
export const defaultLocale: Locale = "en";

/** Type guard for untrusted input — path segments, cookies, `Accept-Language`. */
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
