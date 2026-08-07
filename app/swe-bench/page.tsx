import { Suspense } from "react";
import { fetchDashboardData } from "@/src/lib/swe-bench/repository";
import { KpiGrid } from "@/src/components/swe-bench/dashboard/kpi-grid";
import { FilterBarWrapper } from "@/src/components/swe-bench/dashboard/filter-bar-wrapper";
import { LeaderboardTable } from "@/src/components/swe-bench/dashboard/leaderboard-table";
import { SkeletonKpiGrid, SkeletonTable } from "@/src/components/swe-bench/ui/index";
import type { FilterState } from "@/src/types/swe-bench";
import { DEFAULT_SORT } from "@/src/types/swe-bench";

// Search params type for server-side filter reading
interface SearchParams {
  benchmark?: string;
  q?: string;
  sort?: string;
  order?: string;
  page?: string;
  pageSize?: string;
  minRate?: string;
  maxRate?: string;
}

function parseFilters(searchParams: SearchParams): FilterState {
  return {
    benchmark:
      searchParams.benchmark &&
      ["verified", "lite", "full"].includes(searchParams.benchmark)
        ? (searchParams.benchmark as "verified" | "lite" | "full")
        : null,
    search: searchParams.q ?? "",
    min_resolved_rate: searchParams.minRate
      ? Number(searchParams.minRate)
      : null,
    max_resolved_rate: searchParams.maxRate
      ? Number(searchParams.maxRate)
      : null,
    sort: {
      column: (searchParams.sort as FilterState["sort"]["column"]) ??
        DEFAULT_SORT.column,
      direction:
        searchParams.order === "asc" || searchParams.order === "desc"
          ? (searchParams.order as "asc" | "desc")
          : DEFAULT_SORT.direction,
    },
    page: searchParams.page ? Number(searchParams.page) : 1,
    pageSize:
      searchParams.pageSize &&
      [20, 50, 100].includes(Number(searchParams.pageSize))
        ? (Number(searchParams.pageSize) as 20 | 50 | 100)
        : 20,
  };
}

export default async function SWEBenchPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await searchParamsPromise;
  const filters = parseFilters(searchParams);
  const data = await fetchDashboardData(filters);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Summary Grid */}
      <Suspense fallback={<SkeletonKpiGrid />}>
        <KpiGrid data={data.kpi} />
      </Suspense>

      {/* Filter Bar — needs Suspense for useSearchParams */}
      <Suspense
        fallback={
          <div className="h-16 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] animate-pulse" />
        }
      >
        <FilterBarWrapper filters={filters} />
      </Suspense>

      {/* Leaderboard Table */}
      <Suspense fallback={<SkeletonTable />}>
        <LeaderboardTable
          evaluations={data.data}
          pagination={data.pagination}
          filters={filters}
        />
      </Suspense>
    </div>
  );
}