import type { ReactNode } from "react";

/**
 * Second root layout for `/api/*` route handlers. `[locale]` is the other root
 * so `next/root-params` can expose it; API routes sit outside that tree.
 */
export default function ApiRootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
