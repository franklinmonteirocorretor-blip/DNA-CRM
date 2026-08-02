'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import SidebarGroup from './SidebarGroup'
import type { SidebarGroupData } from './SidebarGroup'
import ThemeToggle from './ThemeToggle'
import { LogOut, PanelLeft, PanelRightClose, Menu, X } from 'lucide-react'

// ─── Props ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  groups: SidebarGroupData[]
  usuarioNome: string
  usuarioPerfil: string
}

export default function Sidebar({ groups, usuarioNome, usuarioPerfil }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fecha o drawer mobile ao navegar para outra página
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intencional: fecha drawer ao trocar de rota
    setMobileOpen(false)
  }, [pathname])

  // ESC para fechar mobile
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const initials = usuarioNome
    .split(' ')
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase()

  // ─── Conteúdo da sidebar (compartilhado por desktop e mobile) ───────────
  const sidebarInner = (
    <div className="flex h-full flex-col">
      {/* Logo + nome */}
      <div className={`flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 py-3 ${collapsed ? 'justify-center' : 'px-4'}`}>
        <Link href="/dashboard" className={`flex items-center gap-2 ${collapsed ? '' : 'flex-1'}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold">
            D
          </div>
          {!collapsed && (
            <span className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              DNA CRM
            </span>
          )}
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {groups.map((g) => (
          <SidebarGroup key={g.label} group={g} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer: User + Theme + Collapse + Logout */}
      <div className={`border-t border-gray-200 dark:border-gray-800 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[11px] font-bold text-blue-700 dark:text-blue-400">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{usuarioNome}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{usuarioPerfil}</p>
            </div>
          </div>
        )}

        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <ThemeToggle />

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors duration-150"
            title="Colapsar sidebar"
          >
            {collapsed ? <PanelRightClose size={16} /> :  <PanelLeft size={16} />}
          </button>

          {!collapsed && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-150"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Hamburger mobile ── */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 rounded-lg bg-white dark:bg-gray-900 p-2 text-gray-700 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay mobile ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden transition-opacity duration-300 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Desktop: sidebar fixa ── */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen
          border-r border-gray-200/70 dark:border-gray-800/70
          bg-gray-50 dark:bg-gray-950
          transition-all duration-200 ease-out
          hidden lg:flex
          ${collapsed ? 'w-[64px]' : 'w-[256px]'}
        `}
      >
        {sidebarInner}
      </aside>

      {/* ── Mobile: drawer lateral ── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen
          bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800
          w-[280px] max-w-[85vw]
          transition-transform duration-250 ease-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 z-50 rounded p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        {/* No mobile, nunca collapsed */}
        <aside style={{ all: 'unset' }} className="h-full">{sidebarInner}</aside>
      </aside>
    </>
  )
}