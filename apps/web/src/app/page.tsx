import Link from "next/link";

import { Button } from "@repo/ui/components/button";

const stack = [
  "Next.js (App Router)",
  "TypeScript",
  "Turborepo + pnpm workspaces",
  "Oxlint + Oxfmt",
  "Tailwind CSS + shadcn/ui",
  "Drizzle ORM + PostgreSQL",
  "oRPC",
  "Better Auth",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Next.js starter</h1>
        <p className="text-muted-foreground text-sm">
          A minimal monorepo foundation. Everything here is meant to be edited or deleted.
        </p>
      </div>

      <ul className="text-muted-foreground grid gap-1 text-sm">
        {stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="flex gap-3">
        <Button render={<Link href="/sign-up">Create an account</Link>} />
        <Button variant="outline" render={<Link href="/sign-in">Sign in</Link>} />
      </div>
    </main>
  );
}
