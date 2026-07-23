import { followupData } from './actions'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import FollowUpCaixaEntrada from '@/src/components/followup/FollowUpCaixaEntrada'
import FollowUpProximasAcoes from '@/src/components/followup/FollowUpProximasAcoes'
import FollowUpPainelCorretor from '@/src/components/followup/FollowUpPainelCorretor'
import FollowUpPainelGerente from '@/src/components/followup/FollowUpPainelGerente'
import FollowUpInteligencia from '@/src/components/followup/FollowUpInteligencia'
import FollowUpPrioridade from '@/src/components/followup/FollowUpPrioridade'

export default async function FollowUpPage() {
  const data = await followupData()

  if (!data) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-500">Erro ao carregar dados. Verifique sua sessão.</p>
      </div>
    )
  }

  // Determina se é gerente para mostrar painel gerencial
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    : { data: null }
  const ehGerente = perfil?.perfil === 'GERENTE' || perfil?.perfil === 'ADMINISTRADOR'

  return (
    <div className="space-y-6">
      {/* ═══ SEÇÃO 1: Caixa de Entrada ═══ */}
      <FollowUpCaixaEntrada itens={data.caixaEntrada} />

      {/* ═══ SEÇÃO 2: Próximas Ações ═══ */}
      <FollowUpProximasAcoes acoes={data.proximasAcoes} />

      {/* ═══ SEÇÃO 3: Follow-up (registro rápido) reaproveitado ═══ */}
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Registrar Follow-up</h2>
        <p className="mt-1 text-xs text-gray-400">
          Selecione o cliente na Caixa de Entrada acima e registre a atividade na ficha do cliente.
        </p>
      </div>

      {/* ═══ SEÇÃO 4: Prioridade — integrada na Caixa de Entrada ═══ */}
      {/* O score de prioridade já é calculado e exibido na Seção 1 */}

      {/* ═══ SEÇÃO 4: Score de Prioridade ═══ */}
      <FollowUpPrioridade />

      {/* ═══ SEÇÃO 6: Painel do Corretor ═══ */}
      <FollowUpPainelCorretor painel={data.painelCorretor} />

      {/* ═══ SEÇÃO 7: Painel do Gerente (condicional) ═══ */}
      {ehGerente && <FollowUpPainelGerente painel={data.painelGerente} />}

      {/* ═══ SEÇÃO 8: Inteligência (sugestões automáticas) ═══ */}
      <FollowUpInteligencia sugestoes={data.sugestoes} />

      {/* ═══ SEÇÃO 5: Automações (explicação visual) ═══ */}
      <div className="rounded-lg bg-gray-50 p-5 shadow-sm border border-gray-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Automações Ativas</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">✓</span>
            <span>Cliente sem próxima ação → alerta automático</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">✓</span>
            <span>Prazo vencido → alerta crítico</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-green-500">✓</span>
            <span>Follow-up concluído → solicita próxima ação</span>
          </div>
        </div>
      </div>
    </div>
  )
}