"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeSwitcherMenu() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-9 items-center justify-between p-2 text-sm">
        <span>Theme</span>
        <div className="-mr-1.5 flex rounded-full border">
          <button type="button" disabled className="cursor-pointer rounded-full p-1">
            <Sun className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-9 items-center justify-between p-2 text-sm">
      <span>Theme</span>
      <div className="-mr-1.5 flex rounded-full border">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "cursor-pointer rounded-full p-1 transition-all hover:text-foreground first:border-r last:border-l",
            theme === "light"
              ? "border-border text-foreground"
              : "border-transparent text-muted-foreground"
          )}
          aria-label="Set theme to light"
        >
          <Sun className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={cn(
            "cursor-pointer rounded-full p-1 transition-all hover:text-foreground first:border-r last:border-l !border-x",
            theme === "system"
              ? "border-border text-foreground"
              : "border-transparent text-muted-foreground"
          )}
          aria-label="Set theme to system"
        >
          <Monitor className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "cursor-pointer rounded-full p-1 transition-all hover:text-foreground first:border-r last:border-l",
            theme === "dark"
              ? "border-border text-foreground"
              : "border-transparent text-muted-foreground"
          )}
          aria-label="Set theme to dark"
        >
          <Moon className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
