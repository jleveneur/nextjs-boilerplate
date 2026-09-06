import Link from "next/link";

import { defaultLocale } from "@repo/i18n";

/**
 * The app's 404 page.
 *
 * ## Why this is not localized
 *
 * A `not-found.tsx` under `[locale]` would be the obvious place to translate it,
 * and it does not work here. Next's own reference calls out this exact shape:
 * when the root layout is defined with a top-level dynamic segment — which
 * `app/[locale]/layout.tsx` is — a nested not-found cannot be composed with it,
 * and unmatched routes resolve to this file instead. Measured, not assumed: a
 * throwaway route calling `notFound()` under `[locale]` rendered *this* page in
 * both locales, so a localized copy would have been a file that never runs.
 *
 * The documented way out is the experimental `globalNotFound` flag in
 * `next.config.ts`, which lets one file serve unmatched routes app-wide. It is
 * experimental, and an English 404 is a smaller cost than an experimental flag
 * in a foundation, so the copy stays in the default locale until it stabilises.
 *
 * ## Why it carries its own document
 *
 * A request that never matched `[locale]` never entered that layout, so there is
 * no `<html>` around this. It also means no Tailwind layer and no theme
 * provider, hence the inline styles — importing the stylesheet here would pull
 * the full CSS bundle onto a page whose job is to be small and always available.
 */
export default function NotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <main
          style={{
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            textAlign: "center",
            margin: 0,
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>404</p>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>This page could not be found</h1>
          <Link href={`/${defaultLocale}`} style={{ fontSize: "0.875rem" }}>
            Go to the home page
          </Link>
        </main>
      </body>
    </html>
  );
}
