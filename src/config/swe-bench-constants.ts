// Configuration constants for SWE-Bench Dashboard
// Alinhado com Implementation Plan

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export const SORTABLE_COLUMNS = [
  "model_name",
  "resolved_rate",
  "avg_time_seconds",
  "total_tasks",
  "benchmark_type",
  "date_added",
] as const;

export const BENCHMARK_LABELS: Record<string, string> = {
  verified: "SWE-Bench Verified",
  lite: "SWE-Bench Lite",
  full: "SWE-Bench Full",
};

export const BENCHMARK_FILTER_OPTIONS = [
  { value: "", label: "All Benchmarks" },
  { value: "verified", label: "SWE-Bench Verified" },
  { value: "lite", label: "SWE-Bench Lite" },
  { value: "full", label: "SWE-Bench Full" },
];

export const METRIC_COLUMNS: Record<
  string,
  { label: string; format: (value: number) => string }
> = {
  resolved_rate: {
    label: "Resolved Rate",
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  avg_time_seconds: {
    label: "Avg Time",
    format: (v: number) => `${v.toFixed(0)}s`,
  },
  total_tasks: {
    label: "Tasks",
    format: (v: number) => v.toString(),
  },
};