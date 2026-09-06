import { env } from "@/env/client.ts";

/**
 * Absolute origin the app is served from, without a trailing slash.
 *
 * Sitemap entries, `robots.txt` and Open Graph tags all have to be absolute
 * URLs — a relative one is either ignored or resolved against the crawler's
 * idea of the origin, which is not ours behind a proxy. Deriving them all from
 * one place is what stops `sitemap.xml` advertising a different host than the
 * canonical tags.
 *
 * Reads `NEXT_PUBLIC_APP_URL` through `@/env/client.ts` rather than
 * `process.env` so the value is validated at startup, and inlined at build time
 * the same way every other public value is.
 */
export function publicUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/+$/u, "");
}
