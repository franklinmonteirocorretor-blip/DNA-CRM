// ─── Centro de Comando (Sprint 14) ─────────────────────────────────────────
// Botões rápidos para navegação entre módulos do CRM.
// Integrado com dark mode via Tailwind `dark:` classes.

import Link from 'next/link'

interface ComandoLink {
  href: string
  label: string
  icone: string
  color: 'blue' | 'green' | 'amber' | 'purple' | 'indigo' | 'teal' | 'rose' | 'sky' | 'cyan'
}

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900',
  green:  'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900',
  amber:  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900',
  teal:   'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800 dark:hover:bg-teal-900',
  rose:   'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900',
  sky:    'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 dark:hover:bg-sky-900',
  cyan:   'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900',
}

const LINKS: ComandoLink[] = [
  { href: '/dashboard/clientes/novo',  label: 'Novo Cliente',     icone: '👤', color: 'blue' },
  { href: '/dashboard/agenda',         label: 'Agenda',           icone: '📅', color: 'amber' },
  { href: '/dashboard/financeiro',     label: 'Financeiro',       icone: '💰', color: 'green' },
  { href: '/dashboard/funil',          label: 'Pipeline',         icone: '📊', color: 'indigo' },
  { href: '/dashboard/documentos',     label: 'Documentos',       icone: '📄', color: 'purple' },
  { href: '/dashboard/corretores',     label: 'Corretores',       icone: '👥', color: 'teal' },
  { href: '/dashboard/gestao',         label: 'Gestão',           icone: '📈', color: 'sky' },
  { href: '/dashboard/operacao',       label: 'Operação',         icone: '⚙️', color: 'cyan' },
]

export default function CentroComando() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Centro de Comando</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Acesso rápido aos módulos do CRM</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg border p-3 text-center transition ${COLOR_MAP[link.color]} flex flex-col items-center gap-1`}
          >
            <span className="text-xl">{link.icone}</span>
            <span className="text-xs font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}