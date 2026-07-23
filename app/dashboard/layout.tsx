import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NotificacoesBell from '@/src/components/layout/NotificacoesBell'

// Layout do Dashboard — protege todas as páginas dentro de /dashboard/*
// Se o usuário não estiver logado, redireciona para /login automaticamente.
// Isso é uma segunda camada de segurança (além do middleware).

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca o perfil do usuário para exibir no header
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil, avatar_url')
    .eq('id', user.id)
    .single()

  const ehGerente = usuario?.perfil === 'GERENTE' || usuario?.perfil === 'ADMINISTRADOR'

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header simples */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-lg font-bold text-gray-900 hover:text-blue-600">
            DNA CRM
          </Link>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {usuario?.perfil ?? 'CORRETOR'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NotificacoesBell usuarioId={user.id} />
          <span className="text-sm text-gray-600">
            {usuario?.nome ?? user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Navegação secundária */}
      <nav className="border-b bg-white px-6 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/clientes">Clientes</NavLink>
          <NavLink href="/dashboard/agenda">Agenda</NavLink>
          <NavLink href="/dashboard/gestao">Gestão</NavLink>
          <NavLink href="/dashboard/funil">Funil</NavLink>
          <NavLink href="/dashboard/empreendimentos">Empreendimentos</NavLink>
          <NavLink href="/dashboard/rankings">Rankings</NavLink>
          <NavLink href="/dashboard/relatorios">Relatórios</NavLink>
          {ehGerente && <NavLink href="/dashboard/equipe">Equipe</NavLink>}
        </div>
      </nav>

      {/* Conteúdo da página */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
    >
      {children}
    </Link>
  )
}