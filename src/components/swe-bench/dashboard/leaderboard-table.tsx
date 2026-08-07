"use client";

// Leaderboard Table
// RFC 882: Tabela ordenável, colunas: Rank, Model, Resolved Rate, Avg Time, Tasks, Benchmark
// WCAG AA: aria-sort, role table, semantic HTML

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/src/components/swe-bench/ui/index";
import { EmptyState } from "@/src/components/swe-bench/ui/feedback";
import { LiveAnnouncement } from "@/src/components/swe-bench/ui/live-announcement";
import type { Evaluation, FilterState, PaginationMeta, SortableColumn } from "@/src/types/swe-bench";
import { BENCHMARK_LABELS } from "@/src/config/swe-bench-constants";

interface LeaderboardTableProps {
  evaluations: Evaluation[];
  pagination: PaginationMeta;
  filters: FilterState;
}

// Column definitions
interface ColumnDef {
  key: SortableColumn | "rank";
  header: string;
  accessor: (item: Evaluation, index: number) => string | number;
  sortable: boolean;
  align: "left" | "center" | "right";
  className?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "rank",
    header: "#",
    accessor: (_item: Evaluation, index: number) => index + 1,
    sortable: false,
    align: "center",
    className: "w-[48px]",
  },
  {
    key: "model_name",
    header: "Model",
    accessor: (item: Evaluation) => item.model_name,
    sortable: true,
    align: "left",
    className: "",
  },
  {
    key: "resolved_rate",
    header: "Resolved Rate",
    accessor: (item: Evaluation) => `${item.resolved_rate}%`,
    sortable: true,
    align: "right",
    className: "w-[120px]",
  },
  {
    key: "avg_time_seconds",
    header: "Avg Time",
    accessor: (item: Evaluation) => `${item.avg_time_seconds}s`,
    sortable: true,
    align: "right",
    className: "w-[100px]",
  },
  {
    key: "total_tasks",
    header: "Tasks",
    accessor: (item: Evaluation) => item.total_tasks,
    sortable: true,
    align: "right",
    className: "w-[80px]",
  },
  {
    key: "benchmark_type",
    header: "Benchmark",
    accessor: (item: Evaluation) => BENCHMARK_LABELS[item.benchmark_type] ?? item.benchmark_type,
    sortable: true,
    align: "left",
    className: "w-[160px]",
  },
];

export function LeaderboardTable({
  evaluations,
  pagination,
  filters,
}: LeaderboardTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sort handler
  const handleSort = useCallback(
    (column: SortableColumn) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentSort = params.get("sort");
      const currentOrder = params.get("order");

      if (currentSort === column) {
        // Toggle direction
        const nextOrder = currentOrder === "asc" ? "desc" : "asc";
        params.set("order", nextOrder);
      } else {
        params.set("sort", column);
        params.set("order", "desc"); // Default to descending for rates
      }
      router.push(`/swe-bench?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Sorting indicator
  const getSortIcon = (column: SortableColumn) => {
    if (filters.sort.column !== column) {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-30" aria-hidden="true">
          <path d="M9 11L7 13l-2-2M5 3l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    return filters.sort.direction === "asc" ? (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 3v8M4 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 11V3M4 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Pagination handlers
  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/swe-bench?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pageSize", String(size));
      params.set("page", "1"); // Reset to page 1
      router.push(`/swe-bench?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Leaderboard content
  return (
    <div className="flex flex-col gap-4">
      {/* Table */}
      {evaluations.length > 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-x-auto">
          <table
            role="table"
            aria-label="SWE-Bench Leaderboard"
            className="w-full text-sm"
          >
            <thead>
              <tr
                role="row"
                className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
              >
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    role="columnheader"
                    aria-sort={
                      col.sortable && filters.sort.column === col.key
                        ? filters.sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap ${col.className}`}
                    style={{ textAlign: col.align }}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key as SortableColumn)}
                        className={`inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors w-full ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}
                      >
                        {col.header}
                        {getSortIcon(col.key as SortableColumn)}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation, index) => (
                  <tr
                    key={evaluation.id}
                    role="row"
                    className={`border-b border-[var(--color-border-subtle)] last:border-0 transition-colors hover:bg-[var(--color-bg-raised)] ${
                      index % 2 === 1 ? "bg-[var(--color-bg-primary)]" : "bg-[var(--color-bg-surface)]"
                    }`}
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        role="cell"
                        className={`px-4 py-3 whitespace-nowrap ${col.className}`}
                        style={{ textAlign: col.align }}
                      >
                        {col.key === "model_name" ? (
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {col.accessor(evaluation, index)}
                          </span>
                        ) : col.key === "resolved_rate" ? (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              evaluation.resolved_rate >= 50
                                ? "text-[var(--color-success)]"
                                : evaluation.resolved_rate >= 30
                                  ? "text-[var(--color-warning)]"
                                  : "text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {String(col.accessor(evaluation, index))}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-primary)]">
                            {String(col.accessor(evaluation, index))}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No models found"
          description="Try adjusting your filters or search query to see more results."
          icon={
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
          }
          action={{
            label: "Clear all filters",
            onClick: () => router.push("/swe-bench"),
          }}
        />
      )}

      {/* Pagination */}
      {evaluations.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      {/* Live announcements for screen readers */}
      <LiveAnnouncement
        message={`Showing ${evaluations.length} of ${pagination.totalItems} models, page ${pagination.page} of ${pagination.totalPages}, sorted by ${filters.sort.column}`}
        trigger={`${pagination.page}-${pagination.totalItems}-${filters.sort.column}-${filters.sort.direction}`}
      />
    </div>
  );
}