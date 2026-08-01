// ─── Sprint 15 — Central WhatsApp ──────────────────────────────────────────────
// Página principal da Central WhatsApp — Server Component puro.
// Organizado em grid de 3 colunas: Caixa de Entrada | Chat | Sidebar,
// com abas inferiores: Templates | Métricas | Centro de Comando | Histórico.

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { listarConversas, getMetricas } from '@/src/services/whatsapp'
import WhatsAppClientPage from './client'

export default async function WhatsAppPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return <div>Erro ao autenticar. Tente novamente.</div>
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, perfil, telefone')
    .eq('id', user.id)
    .single()

  if (!usuario) {
    return <div>Usuário não encontrado.</div>
  }

  // Carrega dados iniciais no servidor
  const [conversas, metricas] = await Promise.all([
    listarConversas(usuario.id, { busca: null, status: 'todas', corretorId: null, temNaoLidas: false }),
    getMetricas(usuario.id),
  ])

  return (
    <WhatsAppClientPage
      usuarioId={usuario.id}
      usuarioNome={usuario.nome ?? user.email ?? 'Usuário'}
      conversasIniciais={conversas}
      metricasIniciais={metricas}
    />
  )
}