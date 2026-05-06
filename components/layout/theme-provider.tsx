"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("resumeai-theme");
    const nextTheme = stored === "light" ? "light" : "dark";
    applyTheme(nextTheme);
    window.requestAnimationFrame(() => setTheme(nextTheme));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("resumeai-theme", theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <div data-theme={theme}>
      {children}
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        className="fixed bottom-4 right-4 z-50 hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-muted-foreground shadow-[var(--shadow-card)] transition hover:text-foreground md:flex"
      >
        {theme === "dark" ? "L" : "D"}
      </button>
    </div>
  );
}
