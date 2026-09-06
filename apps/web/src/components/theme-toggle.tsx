"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@repo/ui";
import { Icon, Moon02Icon, Sun03Icon } from "@repo/ui/icons";

export function ThemeToggle() {
  const t = useTranslations("Shell");
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={t("theme")}
      onClick={() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
    >
      <Icon icon={Moon02Icon} className="dark:hidden" />
      <Icon icon={Sun03Icon} className="hidden dark:block" />
    </Button>
  );
}
