import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { PROTECTED_ROUTES, PUBLIC_ROUTES, ADMIN_ROUTES, DASHBOARD_ROUTES } from '@/src/config/routes'

// Middleware de autenticação do Supabase.
//
// O que ele faz:
// 1. Atualiza os cookies de sessão a cada requisição (mantém o login vivo)
// 2. Se o usuário NÃO está logado e tenta acessar qualquer rota protegida,
//    redireciona para /login
// 3. Se o usuário ESTÁ logado e tenta acessar /login,
//    redireciona para /dashboard
// 4. Restrição de rotas admin (apenas perfil ADMINISTRADOR)
// 5. Todas as rotas do dashboard são protegidas
//
// As listas de rotas ficam em src/config/routes.ts (single source of truth).

const allProtected = [...PROTECTED_ROUTES, ...DASHBOARD_ROUTES]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // eslint-disable-next-line prefer-const
  let supabaseResponse = NextResponse.next({ request })

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
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = allProtected.some((route) => pathname.startsWith(route))
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))

  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin routes — only ADMINISTRADOR
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))

  if (isAdminRoute && user) {
    try {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', user.id)
        .single()

      if (!profile || profile.perfil !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Fallback: qualquer rota não pública que não seja explicitamente protegida
  // também é bloqueada por segurança
  if (!user && !isPublic && !isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  // Rotas que o middleware NÃO processa (arquivos estáticos, imagens, etc.)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}