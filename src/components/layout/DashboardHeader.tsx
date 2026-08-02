'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificacoesBell from './NotificacoesBell'

// ─── Breadcrumb label por rota ────────────────────────────────────────────
const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard':                'Dashboard',
  '/dashboard/operacao':       'Operação',
  '/dashboard/clientes':       'Clientes',
  '/dashboard/funil':          'Funil',
  '/dashboard/agenda':         'Agenda',
  '/dashboard/followup':       'Follow-up',
  '/dashboard/documentos':     'Documentos',
  '/dashboard/financeiro':     'Financeiro',
  '/dashboard/corretores':     'Corretores',
  '/dashboard/gestao':         'Gestão',
  '/dashboard/bi':             'BI',
  '/dashboard/rankings':       'Rankings',
  '/dashboard/empreendimentos':'Empreendimentos',
  '/dashboard/automacoes':     'Automações',
  '/dashboard/copiloto':       'Copiloto',
  '/dashboard/whatsapp':       'WhatsApp',
  '/dashboard/relatorios':     'Relatórios',
  '/dashboard/equipe':         'Equipe',
}

interface DashboardHeaderProps {
  userId: string
  userName: string
  userEmail: string
  userInitials: string
}

export default function DashboardHeader({
  userId,
  userName,
  userEmail,
  userInitials,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const paginaAtual = BREADCRUMB_MAP[pathname] ?? ''

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800/70 px-4"
      style={{ height: 48, minHeight: 48 }}
    >
      {/* ── Breadcrumb ── */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-[256px]">
        <Link
          href="/dashboard"
          className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
        >
          DNA CRM
        </Link>
        {pathname !== '/dashboard' && (
          <>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {paginaAtual}
            </span>
          </>
        )}
      </div>

      {/* ── Lado direito: notificações + perfil ── */}
      <div className="flex items-center gap-3 ml-auto">
        <NotificacoesBell usuarioId={userId} />

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[11px] font-bold text-blue-700 dark:text-blue-400">
            {userInitials}
          </div>
          <span className="hidden sm:block text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
            {userName || userEmail}
          </span>
        </div>
      </div>
    </header>
  )
}