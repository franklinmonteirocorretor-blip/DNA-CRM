import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'

// O Supabase redireciona para cá depois de:
// - Confirmar e-mail (sign up)
// - Resetar senha
// - Login com Magic Link (futuro)
// - Login OAuth (futuro)
//
// Esta rota troca o `code` da URL por uma sessão (cookies)
// e redireciona para o dashboard.

/** Apenas caminhos locais — bloqueia open redirect via `next` */
function isCaminhoSeguro(caminho: string): boolean {
  return (
    caminho.startsWith('/') &&
    !caminho.startsWith('//') &&
    !caminho.startsWith('/\\') &&
    !caminho.includes('\\') &&
    !caminho.includes('\n') &&
    !caminho.includes('\r') &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(caminho)
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/dashboard'
  const next = isCaminhoSeguro(nextRaw) ? nextRaw : '/dashboard'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Se não tem code (ex: acesso direto à URL), vai para login
  return NextResponse.redirect(new URL('/login', origin))
}