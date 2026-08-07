// SWE-Bench Server Actions
// Provides data fetching via server actions for client-side interactions
// Alinhado com Implementing Plan FASE 4

"use server";

import { getEvaluations, getKPISummary } from "@/src/lib/swe-bench/repository";
import type { FilterState } from "@/src/types/swe-bench";

// Revalidation tag
export async function revalidateSweBench() {
  // Will trigger revalidation via tag
  return { revalidated: true, timestamp: Date.now() };
}

// Fetch evaluations (server action)
export async function fetchEvaluations(filters: FilterState) {
  "use server";
  return getEvaluations(filters);
}

// Fetch KPI summary (server action)
export async function fetchKPISummary() {
  "use server";
  return getKPISummary();
}