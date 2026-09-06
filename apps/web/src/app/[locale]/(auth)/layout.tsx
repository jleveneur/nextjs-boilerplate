import type { ReactNode } from "react";

import { Card } from "@repo/ui";
import { Toaster } from "@repo/ui/toast";

type Props = {
  children: ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <Toaster>
      <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">{children}</Card>
      </main>
    </Toaster>
  );
}
