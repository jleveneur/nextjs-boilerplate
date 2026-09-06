import { Suspense } from "react";

import { redirect } from "@/i18n/navigation.ts";

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
  return redirect({ href: `/${orgSlug}/invoices`, locale });
}
