import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { loadSettingsSession } from "@/features/settings/load-settings-session.ts";
import { MembersPanel } from "@/features/settings/members-panel.tsx";
import { requireLocale } from "@/i18n/params.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale: requireLocale(locale), namespace: "Settings" });
  return { title: t("membersTitle") };
}

export default async function SettingsMembersPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const t = await getTranslations("Settings");
  const session = await loadSettingsSession(requireLocale(locale), orgSlug);

  if (!session.canManage) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("forbidden")}
      </p>
    );
  }

  return (
    <MembersPanel
      organizationId={session.organization.id}
      currentUserId={session.user.id}
      currentRole={session.role}
    />
  );
}
