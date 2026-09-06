"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

const schema = z.object({
  name: z.string().min(1).max(80),
});

type Values = z.infer<typeof schema>;

type KeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
};

type Props = {
  organizationId: string;
  userId: string;
};

export function ApiKeysPanel({ organizationId, userId }: Props) {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const load = useCallback(async () => {
    const { data, error: resultError } = await authClient.apiKey.list({
      query: { organizationId },
    });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      setKeys([]);
      return;
    }
    const rows = data?.apiKeys ?? [];
    setKeys(
      rows.map((key) => ({
        id: key.id,
        name: key.name,
        start: key.start,
        prefix: key.prefix,
      })),
    );
  }, [organizationId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(values: Values) {
    setError(null);
    setCreatedKey(null);
    const { data, error: resultError } = await authClient.apiKey.create({
      name: values.name,
      organizationId,
      metadata: { userId },
    });
    if (resultError || data === null) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setCreatedKey(data.key);
    form.reset({ name: "" });
    await load();
  }

  async function revoke(keyId: string) {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.apiKey.delete({ keyId });
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("apiKeysTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            void form.handleSubmit(onCreate)(event);
          }}
          noValidate
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="api-key-name">{t("apiKeyName")}</Label>
            <Input
              id="api-key-name"
              autoComplete="off"
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t("apiKeyCreate")}
          </Button>
        </form>

        {createdKey === null ? null : (
          <p className="text-sm" role="status">
            {t("apiKeyCreated")}{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs break-all">{createdKey}</code>
          </p>
        )}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        {keys === null ? (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("apiKeysEmpty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-border text-muted-foreground border-b">
              <tr>
                <th className="px-2 py-2 font-medium">{t("apiKeyName")}</th>
                <th className="px-2 py-2 font-medium">{t("apiKeyPrefix")}</th>
                <th className="px-2 py-2 font-medium">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-border border-b last:border-0">
                  <td className="px-2 py-3">{key.name ?? "—"}</td>
                  <td className="px-2 py-3 font-mono text-xs">
                    {key.prefix ?? ""}
                    {key.start ?? ""}
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        void revoke(key.id);
                      }}
                    >
                      {t("apiKeyRevoke")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
