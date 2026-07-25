// ─── Biblioteca de Analytics ───────────────────────────────────────────────────
// Sprint 10 — funções de agregação, cálculo e métricas extraídas de actions.ts

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD)
 * Centraliza a função `hoje()` duplicada em gestao/actions.ts e operacao/actions.ts
 */
export function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Início do mês atual (YYYY-MM-DD) */
export function inicioDoMes(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Último dia do mês atual (YYYY-MM-DD) */
export function ultimoDiaDoMes(): string {
  const d = new Date()
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return ultimo.toISOString().slice(0, 10)
}

/** Dias restantes até o fim do mês */
export function diasRestantesNoMes(): number {
  const agora = new Date()
  const ultimo = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
  return Math.max(0, ultimo.getDate() - agora.getDate())
}

/** Retorna a data de N dias atrás (YYYY-MM-DD ISO) */
export function diasAtras(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString()
}

/** Retorna a data de N dias à frente no formato ISO completo */
export function diasAFrenteISOCompleta(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

/** Retorna a data de N dias à frente no formato YYYY-MM-DD (começo do dia) */
export function diasAFrenteInicio(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Retorna a data de N dias à frente no formato YYYY-MM-DD (fim do dia) */
export function diasAFrenteFim(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/** Hoje início do dia (ISO completo) */
export function hojeInicio(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Hoje fim do dia (ISO completo) */
export function hojeFim(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/** Calcula dias entre duas datas ISO */
export function diasEntre(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

/** Calcula dias entre uma data e agora (timestamp) */
export function diasDesdeData(dataISO: string): number {
  return Math.floor((Date.now() - new Date(dataISO).getTime()) / 86400000)
}

/** Calcula minutos desde uma data ISO até agora */
export function minutosDesdeData(dataISO: string): number {
  return Math.floor((Date.now() - new Date(dataISO).getTime()) / 60000)
}

/** Início da semana atual (segunda-feira) às 00:00 */
export function inicioDaSemana(): string {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diff = diaSemana === 0 ? 6 : diaSemana - 1
  const seg = new Date(hoje)
  seg.setDate(hoje.getDate() - diff)
  seg.setHours(0, 0, 0, 0)
  return seg.toISOString()
}

/** Fim da semana atual (domingo) às 23:59 */
export function fimDaSemana(): string {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diff = diaSemana === 0 ? 0 : 7 - diaSemana
  const dom = new Date(hoje)
  dom.setDate(hoje.getDate() + diff)
  dom.setHours(23, 59, 59, 999)
  return dom.toISOString()
}