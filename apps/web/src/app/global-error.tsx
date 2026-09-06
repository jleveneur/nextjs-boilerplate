"use client";

// oxlint-disable-next-line import/no-unassigned-import -- last-resort root styles
import "@/styles/globals.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh flex-col items-start justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
