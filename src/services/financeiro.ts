// ─── Serviço Financeiro Comercial (Sprint 13) ──────────────────────────────────
// Camada de serviço para mutações financeiras.
// NOTA: As queries de leitura (resumo, comissões, ranking, previsão, etc.)
// foram movidas definitivamente para app/dashboard/financeiro/actions.ts
// durante a auditoria da Sprint 13. Este arquivo agora contém apenas a
// lógica de negócio para gestão de comissão.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'

// ─── Gestão de comissão ──────────────────────────────────────────────────────

export async function gestaoComissaoDB(
  clienteId: string,
  acao: 'RECEBIDA' | 'CANCELADA' | 'REATIVADA',
): Promise<{ sucesso: boolean; erro?: string }> {
  const supabase = await createSupabaseServerClient()

  const dataAgora = new Date().toISOString().slice(0, 10)

  const atualizacao: { comissao_status: string; comissao_data_recebimento?: string | null } = {
    comissao_status: acao === 'RECEBIDA' ? 'RECEBIDA' : acao === 'CANCELADA' ? 'CANCELADA' : 'PREVISTA',
    comissao_data_recebimento: acao === 'RECEBIDA' ? dataAgora : acao === 'REATIVADA' ? null : undefined,
  }

  const { error } = await supabase
    .from('clientes')
    .update(atualizacao)
    .eq('id', clienteId)

  if (error) return { sucesso: false, erro: `Erro ao atualizar status: ${error.message}` }

  // O histórico é registrado automaticamente pelo trigger trg_comissao_status_change
  // (migration 0031). Não inserimos manualmente para evitar duplicação.

  return { sucesso: true }
}