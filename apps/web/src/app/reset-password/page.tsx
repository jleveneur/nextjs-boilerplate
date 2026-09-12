import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { ResetPasswordForm } from "@/components/reset-password-form.tsx";

/**
 * Better Auth validates the token on its own route and redirects here, adding
 * either `?token=` or `?error=INVALID_TOKEN`. Both cases have to be rendered:
 * an expired link is the common one, not the exception.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const usable = error === undefined && token !== undefined && token !== "";

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>{usable ? "Choose a new password" : "That link has expired"}</CardTitle>
          <CardDescription>
            {usable
              ? "Pick something you have not used before."
              : "Reset links are single-use and time-limited."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {usable ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-muted-foreground text-sm">
              <Link
                href="/forgot-password"
                className="text-foreground underline underline-offset-4"
              >
                Request a new link
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
