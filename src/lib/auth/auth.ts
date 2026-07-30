// ─── RBAC: Auth Helpers Server-Side (Sprint 12) ──────────────────────────────
// Re-exporta do lib/server/auth e adiciona funções utilitárias do RBAC.

export { getUsuarioLogado, isAuthenticated, getPerfilUsuario } from '@/src/lib/server/auth'

export {
  temNivelMinimo,
  isAdmin,
  isGerente,
  isSupervisor,
  PERFIL_LABEL as perfilLabel,
  PERFIS_POR_MODULO,
} from '@/src/lib/auth/roles'

export {
  temPermissao,
  getAcoesPermitidas,
  MATRIZ_PERMISSOES,
} from '@/src/lib/auth/permissions'

import { getUsuarioLogado } from '@/src/lib/server/auth'
import { isAdmin as checkAdmin, isGerente as checkGerente } from '@/src/lib/auth/roles'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type { Usuario } from '@/src/types'

/**
 * Verifica se o corretor logado é dono do cliente.
 * Gerente/Admin passam sempre.
 */
export async function isClienteOwner(clienteId: string): Promise<boolean> {
  const usuario = await getUsuarioLogado()
  if (!usuario) return false
  if ((await checkAdmin(usuario.perfil)) || (await checkGerente(usuario.perfil))) return true

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('clientes')
    .select('corretor_responsavel_id')
    .eq('id', clienteId)
    .single()

  return data?.corretor_responsavel_id === usuario.id
}

/**
 * Busca os IDs dos corretores da equipe de um supervisor.
 */
export async function getCorretoresEquipe(supervisorId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .eq('supervisor_id', supervisorId)
    .eq('status_usuario', 'ATIVO')
    .is('deleted_at', null)

  return (data ?? []).map((c) => c.id)
}