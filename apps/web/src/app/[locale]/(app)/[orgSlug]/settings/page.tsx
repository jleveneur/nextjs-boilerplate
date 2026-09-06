import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { loadSettingsSession } from "@/features/settings/load-settings-session.ts";
import { OrgGeneralForm } from "@/features/settings/org-general-form.tsx";
import { requireLocale } from "@/i18n/params.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale: requireLocale(locale), namespace: "Settings" });
  return { title: t("orgTitle") };
}

export default async function SettingsOrgPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await loadSettingsSession(requireLocale(locale), orgSlug);

  return (
    <OrgGeneralForm
      orgSlug={orgSlug}
      organization={session.organization}
      canManage={session.canManage}
    />
  );
}
