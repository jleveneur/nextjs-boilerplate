import type { ReactNode } from "react";

// Root layout is a passthrough: locale-specific `<html lang>` lives under `[locale]`.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
