import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Usuario } from '@/src/types'

// Busca o perfil do usuário logado na tabela public.usuarios.
// Retorna null se não estiver logado ou se o perfil não existir.
export async function getUsuarioLogado(): Promise<Usuario | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  return usuario ?? null
}

// Retorna true se o usuário está logado e tem um perfil ativo
export async function isAuthenticated(): Promise<boolean> {
  const usuario = await getUsuarioLogado()
  return usuario !== null && usuario.ativo === true
}

// Retorna o perfil do usuário (CORRETOR, GERENTE, ADMINISTRADOR) ou null
export async function getPerfilUsuario(): Promise<string | null> {
  const usuario = await getUsuarioLogado()
  return usuario?.perfil ?? null
}