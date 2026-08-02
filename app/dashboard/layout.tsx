import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { redirect } from 'next/navigation'
import { Sidebar, DashboardHeader } from '@/src/components/layout'
import type { SidebarGroupData } from '@/src/components/layout'
import {
  LayoutDashboard,
  Users,
  Funnel,
  CalendarDays,
  Clock4,
  FileText,
  DollarSign,
  Star,
  BarChart3,
  Settings,
  MessageCircle,
  Zap,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'

// ─── DNA CRM v2.0 — Layout Principal (Sidebar + Header) ─────────────────
// Elimina a navbar horizontal. Sidebar fixa + Header compacto.
// Referências: Linear, Vercel, Stripe, Clerk, GitHub, Supabase Studio, Raycast.

// ─── Helper: wrapper de ícone lucide com tamanho padrão ────────────────
const i = (Icon: React.ComponentType<{ className?: string }>) => (
  <Icon className="h-[18px] w-[18px]" />
)

// ─── Sidebar Groups ─────────────────────────────────────────────────────
function buildGroups(isManager: boolean, canSeeFinance: boolean): SidebarGroupData[] {
  return [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', href: '/dashboard',          icon: i(LayoutDashboard) },
        { label: 'Operação',  href: '/dashboard/operacao', icon: i(Clock4) },
      ],
    },
    {
      label: 'CRM',
      items: [
        { label: 'Clientes',   href: '/dashboard/clientes',   icon: i(Users) },
        { label: 'Funil',       href: '/dashboard/funil',     icon: i(Funnel) },
        { label: 'Agenda',      href: '/dashboard/agenda',    icon: i(CalendarDays) },
        { label: 'Follow-up',   href: '/dashboard/followup',  icon: i(Clock4) },
        { label: 'Documentos',  href: '/dashboard/documentos',icon: i(FileText) },
      ],
    },
    {
      label: 'Gestão',
      items: [
        ...(canSeeFinance
          ? [{ label: 'Financeiro', href: '/dashboard/financeiro', icon: i(DollarSign) }]
          : []),
        { label: 'Corretores', href: '/dashboard/corretores', icon: i(Users) },
        { label: 'Rankings',   href: '/dashboard/rankings',   icon: i(Star) },
        { label: 'BI',         href: '/dashboard/bi',         icon: i(BarChart3) },
        { label: 'Gestão',     href: '/dashboard/gestao',     icon: i(Settings) },
      ],
    },
    {
      label: 'Comunicação',
      items: [
        { label: 'WhatsApp',  href: '/dashboard/whatsapp',  icon: i(MessageCircle) },
        { label: 'Copiloto',  href: '/dashboard/copiloto',  icon: i(Zap) },
      ],
    },
    {
      label: 'Configuração',
      items: [
        { label: 'Empreendimentos', href: '/dashboard/empreendimentos', icon: i(Building2) },
        { label: 'Automações',      href: '/dashboard/automacoes',      icon: i(Settings) },
        { label: 'Relatórios',      href: '/dashboard/relatorios',       icon: i(FileSpreadsheet) },
        ...(isManager
          ? [{ label: 'Equipe', href: '/dashboard/equipe', icon: i(Users) }]
          : []),
      ],
    },
  ]
}

// ─── Layout Component ────────────────────────────────────────────────────
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil, avatar_url')
    .eq('id', user.id)
    .single()

  const isManager = usuario?.perfil === 'GERENTE' || usuario?.perfil === 'ADMINISTRADOR'
  const canSeeFinance = isManager || usuario?.perfil === 'SUPERVISOR'
  const groups = buildGroups(isManager, canSeeFinance)

  const displayName = usuario?.nome ?? user.email ?? 'Usuário'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((s: string) => s[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Header compacto ── */}
      <DashboardHeader
        userId={user.id}
        userName={displayName}
        userEmail={user.email ?? ''}
        userInitials={initials}
      />

      <div className="flex">
        {/* ── Sidebar ── */}
        <Sidebar
          groups={groups}
          usuarioNome={displayName}
          usuarioPerfil={usuario?.perfil ?? 'CORRETOR'}
        />

        {/* ── Conteúdo ── */}
        <main
          className="flex-1 min-h-[calc(100vh-48px)] p-6"
          style={{ minWidth: 0 }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}