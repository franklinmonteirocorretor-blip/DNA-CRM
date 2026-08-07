// Filter bar wrapper component
// Required because useSearchParams must be wrapped in Suspense boundary
// key forces remount when search changes externally (back/forward navigation)

"use client";

import { FilterBar } from "./filter-bar";
import type { FilterState } from "@/src/types/swe-bench";

export function FilterBarWrapper({ filters }: { filters: FilterState }) {
  return (
    <FilterBar
      key={`${filters.search}-${filters.benchmark}-${filters.min_resolved_rate}-${filters.max_resolved_rate}`}
      filters={filters}
    />
  );
}