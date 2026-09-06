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

  // No explicit generics: `mutationOptions()` already carries the typed error
  // contract declared on the procedure, and `useMutation` infers it — so
  // `onError` narrows to `ORPCError<"CONFLICT", { appCode: … }>` at the call
  // site. `mutateAsync` is the one thing that loses it: its promise is typed
  // `Promise<TData>` with no error channel.
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
