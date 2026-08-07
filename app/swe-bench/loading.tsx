export default function SWEBenchLoading() {
  return (
    <div
      role="status"
      aria-label="Loading leaderboard"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4"
    >
      {/* Spinner */}
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-subtle)] border-t-[var(--color-accent)]"
        aria-hidden="true"
      />
      <p className="text-sm text-[var(--color-text-secondary)]">
        Loading SWE-Bench data...
      </p>
      <span className="sr-only">Loading leaderboard data, please wait.</span>
    </div>
  );
}