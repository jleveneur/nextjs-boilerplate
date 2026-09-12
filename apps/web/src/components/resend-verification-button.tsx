"use client";

import { useState } from "react";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui";

export function ResendVerificationButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "failed">("idle");

  async function resend() {
    setState("pending");

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });

      setState(result.error ? "failed" : "sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
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
        disabled={state === "pending"}
        onClick={() => {
          void resend();
        }}
      >
        {state === "pending" ? "Sending…" : "Send it again"}
      </Button>

      {state === "failed" ? (
        <p className="text-destructive text-sm" role="alert">
          Could not send the email. Try again in a moment.
        </p>
      ) : null}
    </div>
  );
}
