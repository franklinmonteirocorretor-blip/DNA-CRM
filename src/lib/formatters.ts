// ── Biblioteca de Formatadores ──────────────────────────────────────────────────
// Sprint 10 Fase 4 — centraliza todos os formatadores de moeda, horas, data e data/hora
// antes espalhados em diversos componentes

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Threshold para formatação de milhão (valor >= 1M) */
const MILHAS = 1_000_000
/** Threshold para formatação de milhar (valor >= 1k) */
const MILHAR = 1_000
/** Horas em 1 dia */
const HORAS_POR_DIA = 24
/** Horas em 1 semana (7 dias) */
const HORAS_POR_SEMANA = 168
/** Dias em 1 mês (aproximado) */
const DIAS_POR_MES = 30

/** Formata valor como moeda BRL completa (ex: R$ 1.500,00) */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Formata valor compacto (ex: R$ 1.5M, R$ 200k, R$ 500) */
export function formatarMoedaCompacta(valor: number): string {
  if (valor >= MILHAS) return `R$ ${(valor / MILHAS).toFixed(1)}M`
  if (valor >= MILHAR) return `R$ ${(valor / MILHAR).toFixed(0)}k`
  return `R$ ${valor}`
}

/** Formata horas em formato curto (ex: 36h, 3 dias, 2 sem) */
export function formatarHoras(horas: number): string {
  if (horas < HORAS_POR_DIA) return `${horas}h`
  if (horas < HORAS_POR_SEMANA) return `${Math.round(horas / HORAS_POR_DIA)} dias`
  return `${Math.round(horas / HORAS_POR_SEMANA)} sem`
}

/** Formata horas em formato extenso (ex: 36h, 3 dias, 2 meses) */
export function formatarHorasExtenso(horas: number): string {
  const dias = Math.floor(horas / HORAS_POR_DIA)
  if (dias >= DIAS_POR_MES) return `${Math.floor(dias / DIAS_POR_MES)} meses`
  if (dias >= 1) return `${dias} dias`
  return `${horas}h`
}
/** Formata uma data YYYY-MM-DD conforme o agrupamento (daily/weekly/monthly) */
export function formatarData(data: string, agrupamento: 'daily' | 'weekly' | 'monthly'): string {
  if (agrupamento === 'monthly') {
    const [ano, mes] = data.split('-')
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[Number(mes) - 1]} ${ano}`
  }
  if (agrupamento === 'weekly') return `Sem. ${data.slice(5)}`
  const d = new Date(data + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Formata uma data ISO completa em formato relativo (ex: Hoje 14:30, Ontem 09:15) */
export function formatarDataHora(dataISO: string): string {
  const d = new Date(dataISO)
  const hoje = new Date()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)

  const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${horaStr}`
  if (d.toDateString() === amanha.toDateString()) return `Amanhã, ${horaStr}`

  const diaStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${diaStr} às ${horaStr}`
}