// ─── Biblioteca de Agenda ──────────────────────────────────────────────────────
// Sprint 10 — utilitários de calendário, dias úteis e filtros de agenda



/** Gera um resumo de agendamentos para o card do dashboard */
export function calcularResumoAgenda(agendamentos: Array<{
  status: string
  data_hora: string
}>): {
  total: number
  confirmados: number
  pendentes: number
  reagendados: number
  atrasados: number
} {
  const agora = Date.now()
  const resumo = { total: 0, confirmados: 0, pendentes: 0, reagendados: 0, atrasados: 0 }

  for (const a of agendamentos) {
    resumo.total++
    if (a.status === 'CONFIRMADO') resumo.confirmados++
    if (a.status === 'AGENDADO') resumo.pendentes++
    if (a.status === 'REMARCADO') resumo.reagendados++
    if (new Date(a.data_hora).getTime() < agora) resumo.atrasados++
  }

  return resumo
}

/** Gera as datas de início e fim para cada view da agenda */
export function rangeAgenda(view: 'monthly' | 'weekly' | 'daily', dataRef?: string): {
  dataInicio: string
  dataFim: string
} {
  const ref = dataRef ? new Date(dataRef + 'T00:00:00') : new Date()
  ref.setHours(0, 0, 0, 0)

  if (view === 'daily') {
    return {
      dataInicio: ref.toISOString(),
      dataFim: new Date(ref.getTime() + 86399999).toISOString(),
    }
  }

  if (view === 'weekly') {
    const diaSemana = ref.getDay()
    const diff = diaSemana === 0 ? 6 : diaSemana - 1
    const inicio = new Date(ref)
    inicio.setDate(ref.getDate() - diff)
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)
    fim.setHours(23, 59, 59, 999)
    return {
      dataInicio: inicio.toISOString(),
      dataFim: fim.toISOString(),
    }
  }

  // monthly
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  fim.setHours(23, 59, 59, 999)
  return {
    dataInicio: inicio.toISOString(),
    dataFim: fim.toISOString(),
  }
}

/** Agrupamento de agendamentos por dia */
export function agruparAgendamentosPorDia<T extends { data_hora: string }>(
  items: T[],
): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const item of items) {
    const dia = item.data_hora.slice(0, 10)
    if (!mapa.has(dia)) mapa.set(dia, [])
    mapa.get(dia)!.push(item)
  }
  return mapa
}