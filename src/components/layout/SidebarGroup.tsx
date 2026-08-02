'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SidebarItem from './SidebarItem'
import type { SidebarItemData } from './SidebarItem'

// ─── Tipagens ─────────────────────────────────────────────────────────────
export interface SidebarGroupData {
  label: string
  items: SidebarItemData[]
}

interface Props {
  group: SidebarGroupData
  collapsed: boolean
}

export default function SidebarGroup({ group, collapsed }: Props) {
  const pathname = usePathname()
  const anyActive = group.items.some((item) => pathname.startsWith(item.href))
  const [open, setOpen] = useState(true)

  // Abre o grupo automaticamente se algum item está ativo
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intencional: expande grupo com item ativo
    if (anyActive) setOpen(true)
  }, [anyActive])

  // Se collapsed, apenas renderiza os items sem o label do grupo
  if (collapsed) {
    return (
      <div className="space-y-1 px-2">
        {group.items.map((item) => (
          <SidebarItem key={item.href} item={item} collapsed={true} />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Cabeçalho do grupo — clicável para expandir/recolher */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-150"
      >
        <span className="truncate">{group.label}</span>
        {/* Chevron animado */}
        <svg
          className={`ml-auto h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Itens do grupo (visíveis quando expandido) */}
      {open && (
        <div className="mb-1 space-y-0.5 pl-2">
          {group.items.map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}