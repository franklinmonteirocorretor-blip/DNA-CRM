// ─── RBAC - Server Guards (Sprint 12) ─────────────────────────────────────────

import { getUsuarioLogado } from '@/src/lib/server/auth'
import { temNivelMinimo, isAdmin, isGerente } from '@/src/lib/auth/roles'
import { temPermissao, type Recurso, type Acao } from '@/src/lib/auth/permissions'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type { PerfilUsuario, Usuario } from '@/src/types'

export class AuthError extends Error {
  constructor(
    mensagem: string,
    public readonly codigo: 'NAO_AUTENTICADO' | 'NAO_AUTORIZADO' | 'SEM_PERMISSAO',
    public readonly statusCode: number = 403,
  ) {
    super(mensagem)
    this.name = 'AuthError'
  }
}

/** Garante que o usuário está autenticado e ativo */
export async function requireAuth(): Promise<Usuario> {
  const usuario = await getUsuarioLogado()
  if (!usuario) {
    throw new AuthError('Usuário não autenticado.', 'NAO_AUTENTICADO', 401)
  }
  if (!usuario.ativo) {
    throw new AuthError('Usuário desativado.', 'NAO_AUTORIZADO', 403)
  }
  return usuario
}

/** Garante perfil mínimo */
export async function requireRole(perfilMinimo: PerfilUsuario): Promise<Usuario> {
  const usuario = await requireAuth()
  if (!temNivelMinimo(usuario.perfil, perfilMinimo)) {
    throw new AuthError(
      `Perfil ${usuario.perfil} abaixo do mínimo ${perfilMinimo}.`,
      'NAO_AUTORIZADO', 403,
    )
  }
  return usuario
}

/** Garante permissão granular */
export async function requirePermission(recurso: Recurso, acao: Acao): Promise<Usuario> {
  const usuario = await requireAuth()
  if (!temPermissao(usuario.perfil, recurso, acao)) {
    throw new AuthError(
      `Sem permissão para ${acao} em ${recurso}.`,
      'SEM_PERMISSAO', 403,
    )
  }
  return usuario
}

/** Garante que corretor só acessa seus próprios clientes */
export async function requireClienteOwner(clienteId: string): Promise<Usuario> {
  const usuario = await requireAuth()
  if (isAdmin(usuario.perfil) || isGerente(usuario.perfil)) return usuario

  const supabase = await createSupabaseServerClient()
  const { data: cliente } = await supabase
    .from('clientes')
    .select('corretor_responsavel_id')
    .eq('id', clienteId)
    .single()

  if (!cliente || cliente.corretor_responsavel_id !== usuario.id) {
    throw new AuthError(
      'Acesso negado. Você só pode acessar seus próprios clientes.',
      'SEM_PERMISSAO', 403,
    )
  }
  return usuario
}