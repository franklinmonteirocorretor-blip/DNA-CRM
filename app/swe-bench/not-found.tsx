import Link from "next/link";

export default function SWEBenchNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-raised)]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--color-text-tertiary)]"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Page not found
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md text-center">
        The SWE-Bench page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/swe-bench"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        Go to Leaderboard
      </Link>
    </div>
  );
}