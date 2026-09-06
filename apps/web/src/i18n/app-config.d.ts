/**
 * Tells next-intl what this app's messages and locales actually are.
 *
 * Without this augmentation `useTranslations("Auth")` accepts any namespace and
 * `t("anythingAtAll")` accepts any key: next-intl falls back to rendering the key
 * itself, so a typo ships as visible English gibberish rather than a build
 * failure. With it, both are checked against `en.json` at compile time.
 *
 * `en` is the source catalog — it is the default locale, so it is the one that
 * always has every key. `fr.json` is held to the same shape in `request.ts`.
 */

import type enMessages from "@/messages/en.json";

import type { routing } from "./routing.ts";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof enMessages;
  }
}
