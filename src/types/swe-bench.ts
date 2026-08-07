// SWE-Bench Dashboard Type Definitions
// Alinhado com PRD seção 3 (Modelo de Dados) e RFC 882

export interface Evaluation {
  id: string;
  model_name: string;
  benchmark_type: "verified" | "lite" | "full";
  resolved_rate: number; // 0-100 (%)
  avg_time_seconds: number;
  total_tasks: number;
  pass_k: number; // 1, 10, 100
  date_added: string; // ISO 8601
  metadata: ModelMetadata;
  created_at: string;
  updated_at: string;
}

export interface ModelMetadata {
  provider: string;
  model_family: string;
  regions: string[];
  parameters_b?: number; // params in billions
}

// --- Filter State ---

export interface FilterState {
  benchmark: BenchmarkFilter | null; // null = "All"
  search: string; // model name search
  min_resolved_rate: number | null;
  max_resolved_rate: number | null;
  sort: SortConfig;
  page: number;
  pageSize: PageSize;
}

export type BenchmarkFilter = "verified" | "lite" | "full";

export type PageSize = 20 | 50 | 100;

// --- Sort ---

export interface SortConfig {
  column: SortableColumn;
  direction: "asc" | "desc";
}

export type SortableColumn =
  | "model_name"
  | "resolved_rate"
  | "avg_time_seconds"
  | "total_tasks"
  | "benchmark_type"
  | "date_added";

export const DEFAULT_SORT: SortConfig = {
  column: "resolved_rate",
  direction: "desc",
};

// --- Pagination ---

export interface PaginationMeta {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
}

// --- Dashboard State ---

export interface DashboardState {
  evaluations: Evaluation[];
  pagination: PaginationMeta;
  kpiSummary: KPISummary;
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
}

// --- KPI Summary ---

export interface KPISummary {
  totalModels: number;
  bestResolvedRate: number;
  averageResolvedRate: number;
  totalBenchmarks: number;
  lastUpdate: string;
}

// --- API Response ---

export interface DashboardResponse {
  data: Evaluation[];
  pagination: PaginationMeta;
  kpi: KPISummary;
}

// --- Table Column Definition ---

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor: (item: T) => string | number;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (item: T) => React.ReactNode;
}

// --- KPI Card Definition ---

export interface KPICardData {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

// --- Benchmark Options ---

export interface BenchmarkOption {
  value: string;
  label: string;
  icon?: string;
}

export const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { value: "all", label: "All Benchmarks" },
  { value: "verified", label: "SWE-Bench Verified" },
  { value: "lite", label: "SWE-Bench Lite" },
  { value: "full", label: "SWE-Bench Full" },
];