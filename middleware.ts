import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Middleware de autenticação do Supabase.
//
// O que ele faz:
// 1. Atualiza os cookies de sessão a cada requisição (mantém o login vivo)
// 2. Se o usuário NÃO está logado e tenta acessar qualquer rota protegida,
//    redireciona para /login
// 3. Se o usuário ESTÁ logado e tenta acessar /login,
//    redireciona para /dashboard
//
// Para adicionar mais rotas protegidas, edite a lista PROTECTED_ROUTES abaixo.
// Para liberar uma rota (ex: /, /sobre), adicione em PUBLIC_ROUTES.

const PROTECTED_ROUTES = ['/dashboard', '/clientes', '/agenda', '/documentos', '/ranking']

const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/test-supabase']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cria um client Supabase que lê/escreve cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
        },
      },
    }
  )

  // Atualiza a sessão (refresh token se necessário)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))

  // Usuário NÃO logado tentando acessar rota protegida → redireciona para /login
  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Usuário logado tentando acessar /login → redireciona para /dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rota não classificada = protegida por padrão (segurança)
  if (!user && !isPublic && !isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Rotas que o middleware NÃO processa (arquivos estáticos, imagens, etc.)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}