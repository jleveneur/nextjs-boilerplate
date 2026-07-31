import { Suspense } from "react";

import { setRequestLocale } from "next-intl/server";

import { redirect } from "../../../../i18n/navigation.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default function OrgHomePage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <OrgHomeRedirect params={params} />
    </Suspense>
  );
}

async function OrgHomeRedirect({ params }: Props): Promise<never> {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);
  return redirect({ href: `/${orgSlug}/invoices`, locale });
}
