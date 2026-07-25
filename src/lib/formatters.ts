// ── Biblioteca de Formatadores ──────────────────────────────────────────────────
// Sprint 10 Fase 4 — centraliza todos os formatadores de moeda, horas, data e data/hora
// antes espalhados em diversos componentes

/** Formata valor como moeda BRL completa (ex: R$ 1.500,00) */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Formata valor compacto (ex: R$ 1.5M, R$ 200k, R$ 500) */
export function formatarMoedaCompacta(valor: number): string {
  if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)}M`
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(0)}k`
  return `R$ ${valor}`
}

/** Formata horas em formato curto (ex: 36h, 3 dias, 2 sem) */
export function formatarHoras(horas: number): string {
  if (horas < 24) return `${horas}h`
  if (horas < 168) return `${Math.round(horas / 24)} dias`
  return `${Math.round(horas / 168)} sem`
}

/** Formata horas em formato extenso (ex: 36h, 3 dias, 2 meses) */
export function formatarHorasExtenso(horas: number): string {
  const dias = Math.floor(horas / 24)
  if (dias >= 30) return `${Math.floor(dias / 30)} meses`
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