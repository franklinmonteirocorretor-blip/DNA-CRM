// Cache configuration for SWE-Bench dashboard
// RFC 882: TTL 5min, stale-while-revalidate pattern via tags

export const CACHE_TAGS = {
  evaluations: "swe-bench-evaluations",
  kpi: "swe-bench-kpi",
} as const;

export const CACHE_TTL = 300; // 5 minutes in seconds

// Revalidation helpers
export function revalidateEvaluations() {
  // Will trigger via server action when DB mutations happen
  return { revalidated: true };
}