'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// ─── Tipagem exportada ─────────────────────────────────────────────────────
export interface SidebarItemData {
  label: string
  href: string
  icon: ReactNode
  badge?: number
}

interface Props {
  item: SidebarItemData
  collapsed: boolean
}

export default function SidebarItem({ item, collapsed }: Props) {
  const pathname = usePathname()
  const isActive = pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={`
        group flex items-center gap-2.5 rounded-md px-2.5 py-2
        text-sm font-medium transition-all duration-150 ease-out
        ${collapsed ? 'justify-center px-0 w-10 mx-auto' : ''}
        ${isActive
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }
      `}
      title={collapsed ? item.label : undefined}
    >
      {/* Ícone */}
      <span className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {item.icon}
      </span>

      {/* Label (oculto quando collapsed) */}
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

      {/* Badge numérico */}
      {!collapsed && item.badge && item.badge > 0 && (
        <span className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}

      {/* Indicador de página ativa */}
      {isActive && !collapsed && (
        <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
      )}
    </Link>
  )
}