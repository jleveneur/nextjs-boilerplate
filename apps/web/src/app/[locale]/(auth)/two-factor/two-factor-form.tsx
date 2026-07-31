"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CardContent, Input, Label } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  authErrorMessage,
  firstOrgInvoicesHref,
  getPostAuthHref,
} from "../../../../features/auth/auth-utils.ts";
import { useRouter } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

const twoFactorSchema = z.object({
  code: z.string().min(6).max(32),
});

type TwoFactorValues = z.infer<typeof twoFactorSchema>;

type Props = {
  nextPath?: string | undefined;
};

export function TwoFactorForm({ nextPath }: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"totp" | "backup">("totp");

  const form = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: TwoFactorValues) {
    setError(null);
    const result =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: values.code })
        : await authClient.twoFactor.verifyBackupCode({ code: values.code });

    if (result.error) {
      setError(authErrorMessage(result.error, t("errorGeneric")));
      return;
    }

    let destination = getPostAuthHref(nextPath, locale);
    if (destination === "/") {
      const { data: orgs } = await authClient.organization.list({});
      destination = firstOrgInvoicesHref(orgs, destination);
    }

    router.push(destination);
    router.refresh();
  }

  return (
    <CardContent className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="two-factor-code">
            {mode === "totp" ? t("twoFactorCode") : t("twoFactorBackupCode")}
          </Label>
          <Input
            id="two-factor-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-invalid={form.formState.errors.code ? true : undefined}
            {...form.register("code")}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {t("twoFactorSubmit")}
        </Button>
      </form>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setMode((current) => (current === "totp" ? "backup" : "totp"));
          form.reset({ code: "" });
          setError(null);
        }}
      >
        {mode === "totp" ? t("twoFactorBackupCode") : t("twoFactorCode")}
      </Button>
    </CardContent>
  );
}
