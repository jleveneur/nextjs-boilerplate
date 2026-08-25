"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "../../trpc/react.ts";

export function useCreateInvoice() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.billing.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.billing.list.pathFilter());
      },
    }),
  );
}

export function useVoidInvoice() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.billing.void.mutationOptions({
      onSuccess: async (invoice) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.billing.list.pathFilter()),
          queryClient.invalidateQueries(trpc.billing.get.queryFilter({ invoiceId: invoice.id })),
        ]);
      },
    }),
  );
}
