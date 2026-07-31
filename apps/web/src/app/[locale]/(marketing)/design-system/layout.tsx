import type { ReactNode } from "react";

import { Toaster } from "@repo/ui/sonner";

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
