import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers.tsx";

import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js starter",
  description: "Next.js, Drizzle, Better Auth, and oRPC in a Turborepo monorepo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
