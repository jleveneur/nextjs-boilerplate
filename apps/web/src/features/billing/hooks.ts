"use client";

import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/orpc/query.ts";
import { useInvalidate } from "@/orpc/use-invalidate.ts";

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

  return useMutation(
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
