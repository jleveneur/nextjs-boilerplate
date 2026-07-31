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
  getPostAuthCallbackURL,
  getPostAuthHref,
} from "../../../../features/auth/auth-utils.ts";
import { OAuthButtons } from "../../../../features/auth/oauth-buttons.tsx";
import { Link, useRouter } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

type SignInValues = z.infer<typeof signInSchema>;

type Props = {
  nextPath?: string | undefined;
};

export function SignInForm({ nextPath }: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const callbackURL = getPostAuthCallbackURL(nextPath, locale);

  async function onSubmit(values: SignInValues) {
    setError(null);
    const { data, error: resultError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL,
    });

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/two-factor");
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
          <Label htmlFor="sign-in-email">{t("email")}</Label>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email webauthn"
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register("email")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="sign-in-password">{t("password")}</Label>
            <Link
              href="/forgot-password"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password webauthn"
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {t("submitSignIn")}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        <Link href="/magic-link" className="underline-offset-4 hover:underline">
          {t("magicLink")}
        </Link>
      </p>

      <OAuthButtons nextPath={nextPath} />

      <p className="text-muted-foreground text-center text-sm">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="text-foreground underline-offset-4 hover:underline">
          {t("submitSignUp")}
        </Link>
      </p>
    </CardContent>
  );
}
