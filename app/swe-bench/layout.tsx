import type { Metadata } from "next";
import { ThemeToggle } from "@/src/components/swe-bench/ui/theme-toggle";

export const metadata: Metadata = {
  title: "SWE-Bench Dashboard — Leaderboard",
  description:
    "Compare AI coding models on SWE-Bench benchmarks. Leaderboard with resolved rates, rankings, and metrics.",
};

export default function SweBenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Screen reader live region for updates */}
      <div
        id="swe-bench-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Skip link — WCAG AA */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-[var(--color-accent)] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        role="banner"
        className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg-surface)]/80"
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto max-w-[1440px] flex items-center justify-between px-4 py-3 md:px-6"
        >
          <div className="flex items-center gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]"
                aria-hidden="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M9 1L16.5 5.2V13.8L9 18L1.5 13.8V5.2L9 1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  SWE-Bench
                </h1>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Leaderboard
                </p>
              </div>
            </div>
          </div>

          {/* Right: Theme toggle */}
          <ThemeToggle />
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer
        role="contentinfo"
        className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
      >
        <div className="mx-auto max-w-[1440px] px-4 py-4 md:px-6 flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <span>SWE-Bench Dashboard &middot; Research Preview</span>
          <span>
            Data from{" "}
            <a
              href="https://www.swebench.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              swebench.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}