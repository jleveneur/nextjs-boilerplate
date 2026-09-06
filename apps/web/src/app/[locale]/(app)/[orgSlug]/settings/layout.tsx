import type { ReactNode } from "react";
import { Suspense } from "react";

import { Skeleton } from "@repo/ui";

import { loadSettingsSession } from "@/features/settings/load-settings-session.ts";
import { SettingsNav } from "@/features/settings/settings-nav.tsx";
import { requireLocale } from "@/i18n/params.ts";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default function SettingsLayout({ children, params }: Props) {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<Skeleton className="mb-6 h-8 w-full" />}>
        <SettingsNavSlot params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function SettingsNavSlot({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>;
}) {
  const { locale, orgSlug } = await params;
  const session = await loadSettingsSession(requireLocale(locale), orgSlug);
  return <SettingsNav orgSlug={orgSlug} role={session.role} />;
}
