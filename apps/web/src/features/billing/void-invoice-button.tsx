"use client";

import { isDefinedError } from "@orpc/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { InvoiceId } from "@repo/types";
import { Button } from "@repo/ui";

import { useRouter } from "@/i18n/navigation.ts";

import { useVoidInvoice } from "./hooks.ts";

type Props = {
  invoiceId: InvoiceId;
  canVoid: boolean;
};

/**
 * Refusals the procedure declares in its error contract, mapped to copy.
 *
 * The keys are checked against the contract by the compiler, so removing a case
 * from `billing.void`'s `.errors()` — or adding one — fails the build here
 * rather than silently falling back to the generic message.
 */
const VOID_ERROR_MESSAGES = {
  INVOICE_ALREADY_PAID: "voidErrorAlreadyPaid",
  INVOICE_ALREADY_VOID: "voidErrorAlreadyVoid",
} as const;

export function VoidInvoiceButton({ invoiceId, canVoid }: Props) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const voidInvoice = useVoidInvoice();
  const [voidError, setVoidError] = useState<string | null>(null);

  function onVoid() {
    setVoidError(null);

    // `mutate` with callbacks rather than `await mutateAsync`: TanStack types
    // the returned promise as `Promise<TData>` with no error channel, so
    // `safe()` and a `catch` both land on `unknown`. `onError` receives the
    // declared `TError`, which is what makes the narrowing below possible.
    voidInvoice.mutate(
      { invoiceId },
      {
        onSuccess: () => {
          router.refresh();
        },
        onError: (error) => {
          // Narrowed to the contract on `billing.void`, so `data.appCode` is a
          // union here rather than a string to guess at.
          if (isDefinedError(error) && error.code === "CONFLICT") {
            setVoidError(t(VOID_ERROR_MESSAGES[error.data.appCode]));
            return;
          }

          // Anything else is an incident, already reported server-side. Its
          // message may be a withheld internal one, so it is not shown.
          setVoidError(t("voidError"));
        },
      },
    );
  }

  if (!canVoid) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="destructive" disabled={voidInvoice.isPending} onClick={onVoid}>
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
