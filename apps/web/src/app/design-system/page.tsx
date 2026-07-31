import Link from "next/link";

import { Button } from "@repo/ui";

import { ThemeToggle } from "../../components/theme-toggle.tsx";
import { DesignSystemGallery } from "./gallery.tsx";

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            Home
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
          <p className="text-muted-foreground max-w-prose text-sm">
            Living gallery for `@repo/ui` primitives, icons, motion, and toasts. Heavy widgets
            (chart / editor / table) are deferred.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <DesignSystemGallery />
    </main>
  );
}
