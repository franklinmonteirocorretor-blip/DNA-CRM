"use client";

// Filter Bar Component
// RFC 882: Benchmark selector, model search, metric filter, active badges, clear all

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select, Badge, Button } from "@/src/components/swe-bench/ui/index";
import { BENCHMARK_FILTER_OPTIONS } from "@/src/config/swe-bench-constants";
import type { FilterState } from "@/src/types/swe-bench";

interface FilterBarProps {
  filters: FilterState;
}

export function FilterBar({ filters }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/swe-bench?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Debounced search (250ms delay)
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ q: value });
      }, 250);
    },
    [updateParams]
  );

  const handleBenchmarkChange = (value: string) => {
    updateParams({ benchmark: value || null });
  };

  const handleClearFilters = () => {
    router.push("/swe-bench"); // Reset all params
  };

  const hasActiveFilters =
    filters.benchmark || filters.search || filters.min_resolved_rate || filters.max_resolved_rate;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter row */}
      <div
        role="search"
        aria-label="Filter leaderboard"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3"
      >
        {/* Benchmark Selector */}
        <div className="min-w-[180px]">
          <label htmlFor="benchmark-filter" className="sr-only">Benchmark type</label>
          <Select
            id="benchmark-filter"
            options={BENCHMARK_FILTER_OPTIONS}
            value={filters.benchmark ?? ""}
            onChange={(e) => handleBenchmarkChange(e.target.value)}
            placeholder="All Benchmarks"
            className="h-9"
          />
        </div>

        {/* Search Input */}
        <div className="min-w-[200px] flex-1 max-w-[320px]">
          <label htmlFor="model-search" className="sr-only">Search models</label>
          <Input
            id="model-search"
            placeholder="Search models..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            icon={
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path d="M10.5 10.5l4 4M1.5 6.5a5 5 0 1 0 10 0 5 5 0 1 0-10 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            className="h-9"
            aria-label="Search models"
          />
        </div>

        {/* Metric filter - min/max */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <label htmlFor="min-rate" className="sr-only">Minimum resolved rate</label>
          <Input
            id="min-rate"
            type="number"
            min={0}
            max={100}
            placeholder="Min %"
            value={filters.min_resolved_rate ?? ""}
            onChange={(e) => updateParams({ minRate: e.target.value || null })}
            className="w-20 h-9 text-center"
            aria-label="Minimum resolved rate"
          />
          <span className="text-[var(--color-text-tertiary)]">&mdash;</span>
          <label htmlFor="max-rate" className="sr-only">Maximum resolved rate</label>
          <Input
            id="max-rate"
            type="number"
            min={0}
            max={100}
            placeholder="Max %"
            value={filters.max_resolved_rate ?? ""}
            onChange={(e) => updateParams({ maxRate: e.target.value || null })}
            className="w-20 h-9 text-center"
            aria-label="Maximum resolved rate"
          />
        </div>

        {/* Clear button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      <ActiveFilterBadges filters={filters} onClickRemove={(key) => {
        if (key === "minRate") {
          // Clear both min and max rate params
          updateParams({ minRate: null, maxRate: null });
        } else {
          updateParams({ [key]: null });
        }
        if (key === "q") setSearchValue("");
      }} />
    </div>
  );
}

// ============================
// Active Filter Badges
// ============================

function ActiveFilterBadges({
  filters,
  onClickRemove,
}: {
  filters: FilterState;
  onClickRemove: (key: string) => void;
}) {
  const badges: { key: string; label: string }[] = [];

  if (filters.benchmark) {
    badges.push({
      key: "benchmark",
      label: `Benchmark: ${filters.benchmark === "verified" ? "SWE-Bench Verified" : filters.benchmark === "lite" ? "SWE-Bench Lite" : "SWE-Bench Full"}`,
    });
  }

  if (filters.search) {
    badges.push({ key: "q", label: `Search: "${filters.search}"` });
  }

  if (filters.min_resolved_rate !== null || filters.max_resolved_rate !== null) {
    const min = filters.min_resolved_rate ?? 0;
    const max = filters.max_resolved_rate ?? 100;
    badges.push({ key: "minRate", label: `Rate: ${min}%–${max}%` });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active filters">
      {badges.map((badge) => (
        <Badge
          key={badge.key}
          color="accent"
          removable
          onRemove={() => onClickRemove(badge.key)}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}