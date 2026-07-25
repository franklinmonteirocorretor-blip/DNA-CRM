// ─── Biblioteca de Documentos ──────────────────────────────────────────────────
// Sprint 10 — verificações de checklist, status e utilitários de documentos

import type { EtapaFunil, TipoDocumento, Documento, StatusValidacaoDoc } from '@/src/types'
import { CHECKLIST_OBRIGATORIO } from '@/src/config/documentos'

/**
 * Verifica o checklist de documentos obrigatórios para uma etapa
 */
export function verificarChecklistLocal(
  etapa: EtapaFunil,
  documentos: Pick<Documento, 'tipo' | 'status_validacao'>[],
): {
  completo: boolean
  obrigatorios: TipoDocumento[]
  faltantes: TipoDocumento[]
  aprovados: number
  pendentes: number
  rejeitados: number
} {
  const obrigatorios = CHECKLIST_OBRIGATORIO[etapa] ?? []
  const statusDocs = new Map<TipoDocumento, StatusValidacaoDoc>()
  for (const doc of documentos) {
    const atual = statusDocs.get(doc.tipo)
    // VALIDADO > outras prioridades
    if (!atual || doc.status_validacao === 'VALIDADO') {
      statusDocs.set(doc.tipo, doc.status_validacao)
    }
  }

  const faltantes: TipoDocumento[] = []
  let aprovados = 0
  let pendentes = 0
  let rejeitados = 0

  for (const tipo of obrigatorios) {
    const status = statusDocs.get(tipo)
    if (!status || status === 'PENDENTE' || status === 'RECEBIDO' || status === 'EM_ANALISE') {
      faltantes.push(tipo)
    }
    if (status === 'VALIDADO') aprovados++
    if (!status || status === 'PENDENTE' || status === 'RECEBIDO') pendentes++
    if (status === 'REJEITADO') rejeitados++
  }

  return {
    completo: faltantes.length === 0,
    obrigatorios,
    faltantes,
    aprovados,
    pendentes,
    rejeitados,
  }
}

/** Conta docs pendentes por cliente */
export function contarDocsPendentes(
  documentos: Pick<Documento, 'cliente_id' | 'status_validacao'>[],
): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const d of documentos) {
    if (d.status_validacao === 'PENDENTE') {
      mapa.set(d.cliente_id, (mapa.get(d.cliente_id) ?? 0) + 1)
    }
  }
  return mapa
}

/** Agrupa tipos de documentos pendentes por cliente */
export function agruparDocsPendentesPorCliente(
  documentos: (Pick<Documento, 'cliente_id' | 'tipo'> & { clienteNome?: string })[],
): Map<string, { nome: string; tipos: string[] }> {
  const mapa = new Map<string, { nome: string; tipos: string[] }>()
  for (const d of documentos) {
    if (!mapa.has(d.cliente_id)) {
      mapa.set(d.cliente_id, { nome: d.clienteNome ?? 'Cliente', tipos: [] })
    }
    mapa.get(d.cliente_id)!.tipos.push(d.tipo)
  }
  return mapa
}