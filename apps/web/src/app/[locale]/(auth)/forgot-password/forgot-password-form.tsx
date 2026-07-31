"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CardContent, Input, Label } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authErrorMessage } from "../../../../features/auth/auth-utils.ts";
import { Link } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

const forgotSchema = z.object({
  email: z.email(),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    setError(null);
    const { error: resultError } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `/${locale}/reset-password`,
    });

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    setSent(true);
  }

  return (
    <CardContent className="flex flex-col gap-4">
      {sent ? (
        <p className="text-sm">{t("checkEmail")}</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forgot-email">{t("email")}</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {t("forgotSubmit")}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="text-sm underline-offset-4 hover:underline">
        {t("backToSignIn")}
      </Link>
    </CardContent>
  );
}
