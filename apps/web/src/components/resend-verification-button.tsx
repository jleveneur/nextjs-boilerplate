"use client";

import { useState } from "react";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";

import { useSubmit } from "@/lib/use-submit.ts";

export function ResendVerificationButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const { pending, error, run } = useSubmit();

  if (sent) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Sent again. It can take a minute to arrive.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          void run(
            () => authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" }),
            () => {
              setSent(true);
            },
          );
        }}
      >
        {pending ? "Sending…" : "Send it again"}
      </Button>

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
