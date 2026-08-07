// ─── SectionHeader v1 — título de seção padronizado ──────────────────
// Substitui 18+ <h2> inline com text-lg font-semibold text-gray-900.
// Suporta subtítulo opcional e tag semântica customizável.

import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  children?: ReactNode
}

export function SectionHeader({ title, subtitle, as: Tag = 'h2', className = '', children }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <Tag className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </Tag>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}