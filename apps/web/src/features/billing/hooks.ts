"use client";

import type { ListInvoicesInput } from "@repo/contracts";
import type { InvoiceId } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "../../trpc/react.ts";

export function useInvoiceList(input: ListInvoicesInput = { limit: 50 }) {
  const trpc = useTRPC();
  return useQuery(trpc.billing.list.queryOptions(input));
}

export function useInvoice(invoiceId: InvoiceId) {
  const trpc = useTRPC();
  return useQuery(trpc.billing.get.queryOptions({ invoiceId }));
}

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
