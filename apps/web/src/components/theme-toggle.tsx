"use client";

import { useTheme } from "next-themes";

import { Button } from "@repo/ui";
import { Icon, Moon02Icon, Sun03Icon } from "@repo/ui/icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        setTheme(isDark ? "light" : "dark");
      }}
    >
      <Icon icon={isDark ? Sun03Icon : Moon02Icon} />
    </Button>
  );
}
