"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

type PasskeyRow = {
  id: string;
  name: string | null;
};

export function AccountPasskeysCard() {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyRow[] | null>(null);
  const [pending, setPending] = useState(false);

  const loadPasskeys = useCallback(async () => {
    const { data, error: resultError } = await authClient.passkey.listUserPasskeys();
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      setPasskeys([]);
      return;
    }
    setPasskeys(
      (data ?? []).map((passkey) => ({
        id: passkey.id,
        name: passkey.name ?? null,
      })),
    );
  }, [t]);

  useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  async function addPasskey() {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.passkey.addPasskey({});
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await loadPasskeys();
    } finally {
      setPending(false);
    }
  }

  async function deletePasskey(id: string) {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.passkey.deletePasskey({ id });
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await loadPasskeys();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("passkeysTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" disabled={pending} onClick={() => void addPasskey()}>
          {t("passkeyAdd")}
        </Button>
        {passkeys === null ? (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        ) : passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("passkeysEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="flex items-center justify-between gap-2 border-b py-2 last:border-0"
              >
                <span className="text-sm">{passkey.name ?? passkey.id}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    void deletePasskey(passkey.id);
                  }}
                >
                  {t("passkeyDelete")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
