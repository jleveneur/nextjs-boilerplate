"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { useState } from "react";

import { trpcClient } from "../trpc/client.ts";
import { TRPCProvider } from "../trpc/react.ts";
import { AnalyticsProvider } from "./analytics-provider.tsx";
import { SentryProvider } from "./sentry-provider.tsx";
import { ThemeProvider } from "./theme-provider.tsx";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <NuqsAdapter>
          <SentryProvider>
            <AnalyticsProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </AnalyticsProvider>
          </SentryProvider>
        </NuqsAdapter>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
