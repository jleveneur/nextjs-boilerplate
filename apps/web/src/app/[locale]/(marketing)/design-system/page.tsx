import { setRequestLocale } from "next-intl/server";

import { Button } from "@repo/ui";

import { ThemeToggle } from "../../../../components/theme-toggle.tsx";
import { Link } from "../../../../i18n/navigation.ts";
import { DesignSystemGallery } from "./gallery.tsx";
import { WidgetsDemoLoader } from "./widgets-demo-loader.tsx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DesignSystemPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            Home
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
          <p className="text-muted-foreground max-w-prose text-sm">
            Living gallery for `@repo/ui` primitives, icons, motion, toasts, and heavy widgets
            (`@repo/ui/chart`, `@repo/ui/editor`, `@repo/ui/table`).
          </p>
        </div>
        <ThemeToggle />
      </header>
      <div className="space-y-10">
        <DesignSystemGallery />
        <WidgetsDemoLoader />
      </div>
    </main>
  );
}
