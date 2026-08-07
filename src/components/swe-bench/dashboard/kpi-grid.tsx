// KPI Card Component
// RFC 882: Grid de 4 cards, ícone, label, valor, subtext

import type { KPISummary } from "@/src/types/swe-bench";

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}

function KPICard({ icon, label, value, subtext }: KPICardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
        <span aria-hidden="true">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</span>
      <span className="text-xs text-[var(--color-text-secondary)]">{subtext}</span>
    </div>
  );
}

// KPI Icons
const KPIModels = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="1" y="3" width="6" height="10" rx="1" />
    <rect x="9" y="6" width="6" height="7" rx="1" />
  </svg>
);

const KPIBest = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 12 5.5 7 8.5 9.5 15 3" />
    <polyline points="11 3 15 3 15 7" />
  </svg>
);

const KPIAverage = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="6" r="4.5" />
    <circle cx="11" cy="11" r="3" />
  </svg>
);

const KPIBenchmarks = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 14h12M5 10v4M8 6v8M11 3v11" />
  </svg>
);

export function KpiGrid({ data }: { data: KPISummary }) {
  const cards: KPICardProps[] = [
    {
      icon: <KPIModels />,
      label: "Models Evaluated",
      value: String(data.totalModels),
      subtext: `Across ${data.totalBenchmarks} benchmarks`,
    },
    {
      icon: <KPIBest />,
      label: "Best Resolved Rate",
      value: `${data.bestResolvedRate}%`,
      subtext: "Highest resolved rate",
    },
    {
      icon: <KPIAverage />,
      label: "Average Rate",
      value: `${data.averageResolvedRate}%`,
      subtext: "Mean across all models",
    },
    {
      icon: <KPIBenchmarks />,
      label: "Last Updated",
      value: formatDate(data.lastUpdate),
      subtext: "Latest evaluation added",
    },
  ];

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <KPICard key={i} {...card} />
      ))}
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "N/A";
  }
}