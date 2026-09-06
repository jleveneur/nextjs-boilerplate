import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ApiKeysPanel } from "@/features/settings/api-keys-panel.tsx";
import { loadSettingsSession } from "@/features/settings/load-settings-session.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("apiKeysTitle") };
}

export default async function SettingsApiKeysPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const t = await getTranslations("Settings");
  const session = await loadSettingsSession(locale, orgSlug);

  if (!session.canManage) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("forbidden")}
      </p>
    );
  }

  return <ApiKeysPanel organizationId={session.organization.id} userId={session.user.id} />;
}
