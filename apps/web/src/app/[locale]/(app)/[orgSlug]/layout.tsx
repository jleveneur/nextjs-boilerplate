import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { Skeleton } from "@repo/ui";

import { EnsureActiveOrg } from "@/components/ensure-active-org.tsx";
import { OrgSwitcher } from "@/components/org-switcher.tsx";
import { SignOutButton } from "@/components/sign-out-button.tsx";
import { ThemeToggle } from "@/components/theme-toggle.tsx";
import { Link } from "@/i18n/navigation.ts";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string; orgSlug: string }>;
};

/**
 * `[orgSlug]` is runtime-only (no generateStaticParams). Await it under
 * Suspense for the header, but keep `{children}` outside that boundary so
 * nested segments are not dropped from instant-navigation validation.
 */
export default function AppShellLayout({ children, params }: Props) {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader params={params} />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={null}>
          <ActivateOrg params={params} />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function AppHeader({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const t = await getTranslations("Shell");

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <nav className="flex flex-1 items-center gap-4">
          <Link
            href={`/${orgSlug}/invoices`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("invoices")}
          </Link>
          <Link
            href={`/${orgSlug}/billing`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("billing")}
          </Link>
          <Link
            href={`/${orgSlug}/settings`}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("settings")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <OrgSwitcher currentSlug={orgSlug} />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

async function ActivateOrg({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <EnsureActiveOrg orgSlug={orgSlug} />;
}

function HeaderFallback() {
  return (
    <header className="border-border sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
        <nav className="flex flex-1 items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </header>
  );
}
