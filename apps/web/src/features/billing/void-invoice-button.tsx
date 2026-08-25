"use client";

import type { InvoiceId } from "@repo/types";
import { Button } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "../../i18n/navigation.ts";
import { useVoidInvoice } from "./hooks.ts";

type Props = {
  invoiceId: InvoiceId;
  canVoid: boolean;
};

export function VoidInvoiceButton({ invoiceId, canVoid }: Props) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const voidInvoice = useVoidInvoice();
  const [voidError, setVoidError] = useState<string | null>(null);

  async function onVoid() {
    setVoidError(null);
    try {
      await voidInvoice.mutateAsync({ invoiceId });
      router.refresh();
    } catch (error) {
      setVoidError(error instanceof Error ? error.message : t("voidError"));
    }
  }

  if (!canVoid) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={voidInvoice.isPending}
        onClick={() => {
          void onVoid();
        }}
      >
        {t("void")}
      </Button>
      {voidError ? (
        <p className="text-destructive text-sm" role="alert">
          {voidError}
        </p>
      ) : null}
    </div>
  );
}
