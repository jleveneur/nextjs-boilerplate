"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session, created in state so React does not build a
  // new one on every render — which would throw the cache away each time.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
