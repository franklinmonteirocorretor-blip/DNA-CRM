'use client'

// ─── DataTable v1 — SaaS Premium (Fase 3) ────────────────────────────────
// Referência: Stripe Dashboard. Sem bordas explícitas. Header sticky.
// Densidade maior. Dark mode nativo.

export interface DataColumn {
  key: string
  label: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  className?: string
}

interface DataTableProps {
  columns: DataColumn[]
  data: Record<string, unknown>[]
  rowKey?: string
  /** Texto quando array vazio */
  emptyText?: string
  className?: string
}

export default function DataTable({
  columns,
  data,
  rowKey = 'id',
  emptyText = 'Nenhum item encontrado.',
  className,
}: DataTableProps) {
  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="sticky top-0 z-10">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${
                  col.className ?? ''}`}
                style={{ textAlign: 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={String(row[rowKey] ?? idx)}
                className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 ${
                      col.className ?? ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}