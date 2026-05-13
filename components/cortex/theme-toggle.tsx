"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // next-themes resolves `resolvedTheme` on the client after hydration.
    // Render a stable placeholder until mounted to prevent hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (!mounted) return;
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle theme"
      }
      disabled={!mounted}
    >
      {!mounted ? (
        <MoonIcon className="size-[18px] opacity-40" aria-hidden />
      ) : isDark ? (
        <SunIcon className="size-[18px]" aria-hidden />
      ) : (
        <MoonIcon className="size-[18px]" aria-hidden />
      )}
    </Button>
  );
}
