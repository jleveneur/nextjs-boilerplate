"use client";

import type { InferClientErrors } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";

import type { orpcClient } from "@/orpc/client.ts";
import { orpc } from "@/orpc/query.ts";
import { useInvalidate } from "@/orpc/use-invalidate.ts";

/**
 * The declared error contract of `billing.void`.
 *
 * TanStack Query defaults `TError` to `Error`, which erases the typed errors a
 * procedure declares with `.errors()` — `isDefinedError` then narrows to
 * `never` at the call site. Passing the inferred union back in is what keeps the
 * contract usable through a hook.
 */
type VoidInvoiceError = InferClientErrors<typeof orpcClient.billing.void>;

export function useCreateInvoice() {
  const invalidate = useInvalidate();

  return useMutation(
    orpc.billing.create.mutationOptions({
      onSuccess: () => invalidate(orpc.billing.list.key()),
    }),
  );
}

export function useVoidInvoice() {
  const invalidate = useInvalidate();

  return useMutation<
    Awaited<ReturnType<typeof orpcClient.billing.void>>,
    VoidInvoiceError,
    Parameters<typeof orpcClient.billing.void>[0]
  >(
    orpc.billing.void.mutationOptions({
      // The detail view is stale too, not just the list it was voided from.
      onSuccess: (invoice) =>
        invalidate(
          orpc.billing.list.key(),
          orpc.billing.get.key({ input: { invoiceId: invoice.id } }),
        ),
    }),
  );
}
