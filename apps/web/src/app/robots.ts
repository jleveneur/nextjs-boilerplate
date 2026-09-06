import type { MetadataRoute } from "next";

import { publicUrl } from "@/lib/public-url.ts";

/**
 * Crawl rules.
 *
 * Two things are kept out of the index. `/api/` is transport, not content. The
 * auth flows that carry a token in the URL — verification, reset, magic link,
 * invitation — must never be crawled: a fetched link is a consumed single-use
 * token, so indexing them both leaks the address and burns the token before the
 * recipient clicks it.
 *
 * `/sign-in` and `/sign-up` stay crawlable. They are ordinary public pages and
 * are often what a search for the product name should return.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        // Matched under any locale prefix.
        "/*/verify-email",
        "/*/reset-password",
        "/*/forgot-password",
        "/*/magic-link",
        "/*/two-factor",
        "/*/accept-invitation",
        "/*/passkey",
        "/*/continue",
      ],
    },
    sitemap: `${publicUrl()}/sitemap.xml`,
  };
}
