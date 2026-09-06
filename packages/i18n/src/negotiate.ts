/**
 * Locale negotiation for requests that are not rendering a page.
 *
 * `next-intl` already negotiates the locale for the web app, because a page has
 * a locale-prefixed URL to read it from. Emails have neither: they are sent from
 * an auth callback or a background job, and the only evidence of what language
 * the recipient reads is whatever the triggering request carried.
 *
 * Kept free of any Next.js import so the same function serves the worker, where
 * there is no framework at all. The inputs are plain strings for the same reason
 * — a caller with a `Request` passes `request.headers.get(…)`, and a caller with
 * a stored preference does not have to fabricate a request to use this.
 */

import { defaultLocale, isLocale, type Locale } from "./locales.ts";

/**
 * Cookie `next-intl` writes when a visitor picks a language.
 *
 * An explicit choice beats a browser default, so this is consulted first. The
 * name is next-intl's default and has to match `apps/web`'s routing config; it
 * is duplicated here rather than imported because this package deliberately does
 * not depend on next-intl.
 */
const LOCALE_COOKIE = "NEXT_LOCALE";

/** `name=value` pairs, tolerating the optional space after each `;`. */
function readCookie(header: string, name: string): string | undefined {
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(pair.slice(separator + 1).trim());
  }
  return undefined;
}

/**
 * Language tags from an `Accept-Language` header, best quality first.
 *
 * Ties keep their original order, which is what the header means: `en, fr` is a
 * preference for English even though both are implicitly q=1. `toSorted` is
 * specified as stable, so this falls out of sorting on quality alone.
 */
function preferredTags(header: string): string[] {
  return header
    .split(",")
    .map((part) => {
      const [tag = "", ...parameters] = part.split(";");
      const quality = parameters
        .map((parameter) => /^\s*q=(?<value>[\d.]+)\s*$/u.exec(parameter)?.groups?.["value"])
        .find((value) => value !== undefined);
      const parsed = quality === undefined ? 1 : Number.parseFloat(quality);
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(parsed) ? 0 : parsed };
    })
    .filter((entry) => entry.tag !== "" && entry.quality > 0)
    .toSorted((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

export type NegotiateLocaleInput = {
  /** Raw `Cookie` request header, if any. */
  readonly cookie?: string | null | undefined;
  /** Raw `Accept-Language` request header, if any. */
  readonly acceptLanguage?: string | null | undefined;
};

/**
 * Picks the best supported locale for a recipient.
 *
 * Order of evidence, strongest first:
 *
 * 1. The `NEXT_LOCALE` cookie — a choice the visitor made deliberately.
 * 2. `Accept-Language`, by quality value, matching the region-less base tag so
 *    `fr-CA` selects `fr`.
 * 3. {@link defaultLocale}.
 *
 * Always returns a supported locale, so callers never handle a negotiation
 * failure: there is no useful thing to do with "no match" other than fall back,
 * and an email that fails to send because nobody sent `Accept-Language` would be
 * a worse outcome than one written in the default language.
 *
 * ```ts
 * negotiateLocale({ acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" }); // "fr"
 * negotiateLocale({ cookie: "NEXT_LOCALE=fr", acceptLanguage: "en" }); // "fr"
 * negotiateLocale({}); // "en"
 * ```
 */
export function negotiateLocale(input: NegotiateLocaleInput = {}): Locale {
  const { cookie, acceptLanguage } = input;

  if (cookie !== undefined && cookie !== null) {
    const chosen = readCookie(cookie, LOCALE_COOKIE);
    if (chosen !== undefined && isLocale(chosen)) {
      return chosen;
    }
  }

  if (acceptLanguage !== undefined && acceptLanguage !== null) {
    for (const tag of preferredTags(acceptLanguage)) {
      // `fr-CA` and `fr` both resolve to `fr`; a locale list that grows regions
      // would need the full tag tried before the base one, which is why the base
      // is derived rather than assumed to be the whole string. Sliced on the
      // separator rather than via `split(…)[0] ?? tag`, whose fallback can never
      // run — `split` always yields at least one element.
      const separator = tag.indexOf("-");
      const base = separator === -1 ? tag : tag.slice(0, separator);
      if (isLocale(tag)) return tag;
      if (isLocale(base)) return base;
    }
  }

  return defaultLocale;
}

/**
 * {@link negotiateLocale} over a `Request`, for callers that have one.
 *
 * `Request` is a platform global in Node 24, so this still costs no dependency.
 */
export function negotiateLocaleFromRequest(request: Request | undefined): Locale {
  if (request === undefined) return defaultLocale;

  return negotiateLocale({
    cookie: request.headers.get("cookie"),
    acceptLanguage: request.headers.get("accept-language"),
  });
}
