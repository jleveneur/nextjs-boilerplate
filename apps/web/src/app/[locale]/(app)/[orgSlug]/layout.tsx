import type { ReactNode } from "react";

import { getTranslations, setRequestLocale } from "next-intl/server";

import { EnsureActiveOrg } from "../../../../components/ensure-active-org.tsx";
import { OrgSwitcher } from "../../../../components/org-switcher.tsx";
import { SignOutButton } from "../../../../components/sign-out-button.tsx";
import { ThemeToggle } from "../../../../components/theme-toggle.tsx";
import { Link } from "../../../../i18n/navigation.ts";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function AppShellLayout({ children, params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Shell");

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <nav className="flex flex-1 items-center gap-4">
            <Link
              href={`/${orgSlug}/invoices`}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              {t("invoices")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <OrgSwitcher currentSlug={orgSlug} />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <EnsureActiveOrg orgSlug={orgSlug}>{children}</EnsureActiveOrg>
      </main>
    </div>
  );
}
