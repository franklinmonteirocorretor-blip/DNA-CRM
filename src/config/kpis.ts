// ─── KPIs e Metas Diárias ─────────────────────────────────────────────────────
// Sprint 10 — centraliza thresholds, labels e definições de KPIs

/** Metas oficiais diárias por corretor (Sprint 3) */
export const KPI_METAS_OFICIAIS = {
  ligacoes: 80,
  whatsapps: 40,
  followUps: 20,
  agendamentos: 2,
  comparecimentos: 2,
  pastas: 1,
} as const

/** Label amigável de cada métrica de KPI */
export const KPI_LABELS: Record<keyof typeof KPI_METAS_OFICIAIS, string> = {
  ligacoes: 'Ligações',
  whatsapps: 'WhatsApps',
  followUps: 'Follow-ups',
  agendamentos: 'Agendamentos',
  comparecimentos: 'Comparecimentos',
  pastas: 'Pastas',
}

/** Status do corretor em relação à meta diária */
export type KPIStatus = 'META_BATIDA' | 'META_PENDENTE'

/** Calcula o percentual diário de um corretor (0–100) */
export function calcularPercentualKPI(producao: {
  ligacoes: number
  whatsapps: number
  followUps: number
  agendamentos: number
  comparecimentos: number
  pastas: number
}): { percentual: number; status: KPIStatus } {
  const pcts = [
    Math.min(100, (producao.ligacoes / KPI_METAS_OFICIAIS.ligacoes) * 100),
    Math.min(100, (producao.whatsapps / KPI_METAS_OFICIAIS.whatsapps) * 100),
    Math.min(100, (producao.followUps / KPI_METAS_OFICIAIS.followUps) * 100),
    Math.min(100, (producao.agendamentos / KPI_METAS_OFICIAIS.agendamentos) * 100),
    Math.min(100, (producao.comparecimentos / KPI_METAS_OFICIAIS.comparecimentos) * 100),
    Math.min(100, (producao.pastas / KPI_METAS_OFICIAIS.pastas) * 100),
  ]
  const percentual = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  return { percentual, status: percentual >= 100 ? 'META_BATIDA' : 'META_PENDENTE' }
}