"use client";

import type { FlagBootstrap } from "@repo/flags/registry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { useState } from "react";

import { trpcClient } from "../trpc/client.ts";
import { TRPCProvider } from "../trpc/react.ts";
import { AnalyticsProvider } from "./analytics-provider.tsx";
import { FlagsProvider } from "./flags-provider.tsx";
import { SentryProvider } from "./sentry-provider.tsx";
import { ThemeProvider } from "./theme-provider.tsx";

export function AppProviders({
  initialFlags,
  children,
}: {
  initialFlags: FlagBootstrap;
  children: ReactNode;
}) {
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
              <FlagsProvider initialFlags={initialFlags}>
                <ThemeProvider>{children}</ThemeProvider>
              </FlagsProvider>
            </AnalyticsProvider>
          </SentryProvider>
        </NuqsAdapter>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
