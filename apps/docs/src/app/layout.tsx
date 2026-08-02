import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { env } from "../env.ts";

// oxlint-disable-next-line import/no-unassigned-import -- Next.css entry
import "./global.css";

void env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: {
    default: "Repo Docs",
    template: "%s · Repo Docs",
  },
  description: "Architecture, ADRs, runbooks, and API reference.",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
