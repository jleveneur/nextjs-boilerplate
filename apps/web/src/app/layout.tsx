import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "../components/theme-provider.tsx";

// oxlint-disable-next-line import/no-unassigned-import -- Next.css entry
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Repo",
  description: "Next.js boilerplate — design system gallery",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
