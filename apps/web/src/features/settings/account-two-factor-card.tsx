"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

const totpSchema = z.object({
  code: z.string().min(6).max(32),
});

const passwordOnlySchema = z.object({
  password: z.string().min(8).max(128),
});

type TotpValues = z.infer<typeof totpSchema>;
type PasswordOnlyValues = z.infer<typeof passwordOnlySchema>;

type Props = {
  enabled: boolean;
};

export function AccountTwoFactorCard({ enabled }: Props) {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [enabledOverride, setEnabledOverride] = useState<boolean | undefined>(undefined);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const twoFactorEnabled = enabledOverride ?? enabled;

  const totpForm = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
    defaultValues: { code: "" },
  });
  const enableForm = useForm<PasswordOnlyValues>({
    resolver: zodResolver(passwordOnlySchema),
    defaultValues: { password: "" },
  });
  const disableForm = useForm<PasswordOnlyValues>({
    resolver: zodResolver(passwordOnlySchema),
    defaultValues: { password: "" },
  });

  async function onEnable(values: PasswordOnlyValues) {
    setError(null);
    const { data, error: resultError } = await authClient.twoFactor.enable({
      password: values.password,
    });
    if (resultError || data === null) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes);
    enableForm.reset({ password: "" });
  }

  async function onVerifyTotp(values: TotpValues) {
    setError(null);
    const { error: resultError } = await authClient.twoFactor.verifyTotp({ code: values.code });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setEnabledOverride(true);
    setTotpUri(null);
    totpForm.reset({ code: "" });
  }

  async function onDisable(values: PasswordOnlyValues) {
    setError(null);
    const { error: resultError } = await authClient.twoFactor.disable({
      password: values.password,
    });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setEnabledOverride(false);
    setTotpUri(null);
    setBackupCodes(null);
    disableForm.reset({ password: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("twoFactorTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex max-w-md flex-col gap-4">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          {twoFactorEnabled ? t("twoFactorEnabled") : t("twoFactorDisabled")}
        </p>
        {twoFactorEnabled ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              void disableForm.handleSubmit(onDisable)(event);
            }}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="disable-2fa-password">{t("twoFactorPassword")}</Label>
              <Input
                id="disable-2fa-password"
                type="password"
                autoComplete="current-password"
                {...disableForm.register("password")}
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={disableForm.formState.isSubmitting}
            >
              {t("twoFactorDisable")}
            </Button>
          </form>
        ) : totpUri === null ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              void enableForm.handleSubmit(onEnable)(event);
            }}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="enable-2fa-password">{t("twoFactorPassword")}</Label>
              <Input
                id="enable-2fa-password"
                type="password"
                autoComplete="current-password"
                {...enableForm.register("password")}
              />
            </div>
            <Button type="submit" disabled={enableForm.formState.isSubmitting}>
              {t("twoFactorEnable")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totp-uri">{t("twoFactorUri")}</Label>
              <Input id="totp-uri" readOnly value={totpUri} />
            </div>
            {backupCodes === null ? null : (
              <div>
                <p className="mb-1 text-sm font-medium">{t("twoFactorBackupCodes")}</p>
                <ul className="font-mono text-xs">
                  {backupCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
              </div>
            )}
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                void totpForm.handleSubmit(onVerifyTotp)(event);
              }}
              noValidate
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totp-code">{t("twoFactorCode")}</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  {...totpForm.register("code")}
                />
              </div>
              <Button type="submit" disabled={totpForm.formState.isSubmitting}>
                {t("twoFactorVerify")}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
