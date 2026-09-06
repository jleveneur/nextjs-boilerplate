import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Deliberately minimal: enough for an installable icon and a browser theme, not
 * an attempt at an offline-capable PWA. Anything more needs a service worker and
 * a cache-invalidation story, which is a product decision rather than something
 * a foundation should presume.
 *
 * Not localized. `manifest.webmanifest` is served from one URL with no locale
 * segment, so the name here is the product name — which is the same in every
 * language — rather than translated copy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Repo",
    short_name: "Repo",
    description: "Auth, organizations, settings, and a billing slice.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
