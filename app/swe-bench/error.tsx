"use client";

import { useEffect } from "react";

export default function SWEBenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SWE-Bench dashboard error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-raised)]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--color-danger)]"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md text-center">
        We couldn&apos;t load the SWE-Bench leaderboard. This might be a temporary
        issue with the database or network.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1.333 8a6.667 6.667 0 1 0 2.296-5.147"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1.333 2v4h4"
          />
        </svg>
        Try again
      </button>
    </div>
  );
}