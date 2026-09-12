"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

/**
 * Catches a render or data error anywhere below the root layout.
 *
 * Without this, production shows Next's unstyled default page. The message is
 * deliberately not rendered: it can carry query fragments or internal detail,
 * and the digest is what actually correlates with a server log.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>That is on us, not on you.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Button onClick={reset}>Try again</Button>

          {error.digest === undefined ? null : (
            <p className="text-muted-foreground text-sm">
              Quote this if you get in touch: <code>{error.digest}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
