"use client";

// Theme toggle for SWE-Bench dashboard header
// RFC 882: Dark mode toggle with sun/moon icon, respects system preference

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Official next-themes pattern to prevent hydration mismatch
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Avoid hydration mismatch: render a placeholder until mounted
  if (!mounted) {
    return (
      <div className="p-2 w-8 h-8" aria-hidden="true" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)] transition-colors"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="block h-4 w-4">
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M14 11.3A6 6 0 1 1 4.7 2a4 4 0 0 0 9.3 9.3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}