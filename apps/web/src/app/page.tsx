import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Repo</h1>
      <p className="text-muted-foreground max-w-prose text-base">
        Phase 7 ships the design system. Product routes, auth, and the billing slice UI arrive in
        Phase 8.
      </p>
      <p>
        <Link
          href="/design-system"
          className="text-primary underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Open design system
        </Link>
      </p>
    </main>
  );
}
