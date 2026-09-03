"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { orpc } from "../../orpc/query.ts";

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.billing.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.billing.list.key() });
      },
    }),
  );
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.billing.void.mutationOptions({
      onSuccess: async (invoice) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.billing.list.key() }),
          queryClient.invalidateQueries({
            queryKey: orpc.billing.get.key({ input: { invoiceId: invoice.id } }),
          }),
        ]);
      },
    }),
  );
}
