"use client";

import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { Button, Input, Label } from "@repo/ui";

import { useSubmit } from "@/lib/use-submit.ts";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { pending, error, run } = useSubmit();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    void run(
      () =>
        authClient.requestPasswordReset({
          email,
          // Better Auth validates the token, then redirects here with it as a
          // query parameter — or with `?error=INVALID_TOKEN` if it has expired.
          redirectTo: "/reset-password",
        }),
      () => {
        setSent(true);
      },
    );
  }

  if (sent) {
    // Deliberately the same message whether or not the address exists: telling
    // the difference is how an attacker enumerates who has an account.
    return (
      <p className="text-sm" role="status">
        If an account exists for {email}, a reset link is on its way.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </div>

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
