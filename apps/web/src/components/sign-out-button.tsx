"use client";

import { Button } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "../i18n/navigation.ts";
import { authClient } from "../lib/auth-client.ts";

export function SignOutButton() {
  const t = useTranslations("Shell");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        void onSignOut();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
