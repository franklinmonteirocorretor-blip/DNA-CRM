// SWE-Bench Repository
// Server-side data access layer using Supabase
// Alinhado com PRD seção 5 (Stack) e RFC 882

import { createSupabaseServerClient } from "@/src/lib/server/supabase";
import { escaparLike } from "@/src/lib/sql-utils";
import type {
  Evaluation,
  FilterState,
  DashboardResponse,
  KPISummary,
  PaginationMeta,
} from "@/src/types/swe-bench";
import { unstable_cache } from "next/cache";

const CACHE_TTL = 300; // 5 minutes

// =========================================================================
// Query Evaluations with filters, sorting, pagination (DB-level)
// =========================================================================

async function getEvaluationsRaw(filters: FilterState): Promise<{
  data: Evaluation[];
  pagination: PaginationMeta;
}> {
  const supabase = await createSupabaseServerClient();
  const { benchmark, search, sort, page, pageSize, min_resolved_rate, max_resolved_rate } = filters;

  // Count query (same filters, no limit/offset)
  let countQuery = supabase
    .from("swe_bench_evaluations")
    .select("*", { count: "exact", head: true });

  if (benchmark) {
    countQuery = countQuery.eq("benchmark_type", benchmark);
  }
  if (search) {
    countQuery = countQuery.ilike("model_name", `%${escaparLike(search)}%`);
  }
  if (min_resolved_rate !== null) {
    countQuery = countQuery.gte("resolved_rate", min_resolved_rate);
  }
  if (max_resolved_rate !== null) {
    countQuery = countQuery.lte("resolved_rate", max_resolved_rate);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(`Count query failed: ${countError.message}`);

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Data query (same filters + sort + pagination)
  let dataQuery = supabase.from("swe_bench_evaluations").select("*");

  if (benchmark) dataQuery = dataQuery.eq("benchmark_type", benchmark);
  if (search) dataQuery = dataQuery.ilike("model_name", `%${escaparLike(search)}%`);
  if (min_resolved_rate !== null) dataQuery = dataQuery.gte("resolved_rate", min_resolved_rate);
  if (max_resolved_rate !== null) dataQuery = dataQuery.lte("resolved_rate", max_resolved_rate);

  // Sort
  const ascending = sort.direction === "asc";
  dataQuery = dataQuery.order(sort.column, { ascending });

  // Pagination using range()
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dataQuery = dataQuery.range(from, to);

  const { data, error } = await dataQuery;
  if (error) throw new Error(`Data query failed: ${error.message}`);

  return {
    data: (data as Evaluation[]) ?? [],
    pagination: { page, pageSize, totalItems, totalPages },
  };
}

// ===========================================================================
// Cached evaluations
// ===========================================================================

const cachedGetEvaluations = unstable_cache(getEvaluationsRaw, ["swe-bench-evaluations"], {
  revalidate: CACHE_TTL,
  tags: ["swe-bench-evaluations"],
});

export async function getEvaluations(filters: FilterState) {
  return cachedGetEvaluations(filters);
}

// ===========================================================================
// KPI Summary (cached)
// ===========================================================================

async function getKPISummaryRaw(): Promise<KPISummary> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalModelsCount, error: countError },
    { data: bestData, error: bestError },
    { data: avgData, error: avgError },
    { data: benchmarkData, error: benchmarkError },
    { data: lastUpdateData },
  ] = await Promise.all([
    supabase.from("swe_bench_evaluations").select("*", { count: "exact", head: true }),
    supabase.from("swe_bench_evaluations").select("resolved_rate").order("resolved_rate", { ascending: false }).limit(1).single(),
    supabase.from("swe_bench_evaluations").select("resolved_rate"),
    supabase.from("swe_bench_evaluations").select("benchmark_type"),
    supabase.from("swe_bench_evaluations").select("updated_at").order("updated_at", { ascending: false }).limit(1).single(),
  ]);

  if (countError) console.warn("KPI count:", countError.message);
  if (bestError && bestError.code !== "PGRST116") console.warn("KPI best:", bestError.message);
  if (avgError && avgError.code !== "PGRST116") console.warn("KPI avg:", avgError.message);
  if (benchmarkError && benchmarkError.code !== "PGRST116") console.warn("KPI benchmarks:", benchmarkError.message);

  const average =
    avgData && avgData.length > 0
      ? avgData.reduce((sum, r) => sum + Number(r.resolved_rate || 0), 0) / avgData.length
      : 0;

  const uniqueBenchmarks = benchmarkData
    ? new Set((benchmarkData as { benchmark_type: string }[]).map((b) => b.benchmark_type)).size
    : 3;

  return {
    totalModels: totalModelsCount ?? 0,
    bestResolvedRate: bestData ? Number(bestData.resolved_rate) : 0,
    averageResolvedRate: Number(average.toFixed(1)),
    totalBenchmarks: uniqueBenchmarks,
    lastUpdate: lastUpdateData?.updated_at || new Date().toISOString(),
  };
}

const cachedGetKPISummary = unstable_cache(getKPISummaryRaw, ["swe-bench-kpi"], {
  revalidate: CACHE_TTL,
  tags: ["swe-bench-kpi"],
});

export async function getKPISummary() {
  return cachedGetKPISummary();
}

// ===========================================================================
// Fetch dashboard data (evaluations + KPI in parallel)
// ===========================================================================

export async function fetchDashboardData(filters: FilterState): Promise<DashboardResponse> {
  const [evalResults, kpi] = await Promise.all([
    getEvaluations(filters),
    getKPISummary(),
  ]);

  return {
    data: evalResults.data,
    pagination: evalResults.pagination,
    kpi,
  };
}