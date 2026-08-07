// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// Página principal do Copiloto IA — Server Component puro.
// Carrega contexto e dados iniciais, delega UI para o Client Component.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { gerarResumoInteligente, gerarRecomendacoes } from '@/src/services/copiloto-engine'
import CopilotoClientPage from './client'

export default async function CopilotoPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return <div className="p-6 text-red-600">Erro ao autenticar. Tente novamente.</div>
  }

  const { data: usuario, error: usuarioErr } = await supabase
    .from('usuarios')
    .select('id, nome, perfil')
    .eq('id', user.id)
    .single()

  if (usuarioErr) throw new Error(usuarioErr.message)

  if (!usuario) {
    return <div className="p-6">Usuário não encontrado.</div>
  }

  const [resumo, recomendacoes] = await Promise.all([
    gerarResumoInteligente(usuario.id),
    gerarRecomendacoes(usuario.id),
  ])

  // const ctx = await buildCopilotContext(usuario.id)

  return (
    <CopilotoClientPage
      usuarioId={usuario.id}
      usuarioNome={usuario.nome ?? user.email ?? 'Usuário'}
      resumoInicial={resumo}
      recomendacoesIniciais={recomendacoes}
    />
  )
}