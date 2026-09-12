"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { FieldError } from "@repo/ui/components/field";

import { serverError, submitToServer } from "@/lib/submit-to-server.ts";

/**
 * No fields, but a pending state and a server error, so it is still a
 * `useForm`. No `<form>` element: `handleSubmit` does not need one.
 */
export function ResendVerificationButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: {},
    validators: {
      onSubmitAsync: () =>
        submitToServer(() =>
          authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" }),
        ),
    },
    onSubmit: () => {
      setSent(true);
    },
  });

  if (sent) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Sent again. It can take a minute to arrive.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              void form.handleSubmit();
            }}
          >
            {isSubmitting ? "Sending…" : "Send it again"}
          </Button>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>
    </div>
  );
}
