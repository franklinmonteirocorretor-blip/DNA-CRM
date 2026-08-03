// ─── EmptyState v2 — SaaS Premium (Fase 3) ────────────────────────────────────
// Sem emoji. Menos altura. Mesma API (backward-compatível).

type EmptyStateVariant = 'default' | 'dashed'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  variant?: EmptyStateVariant
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'dashed') {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
        )}
        {(action || secondaryAction) && (
          <div className="flex gap-2 justify-center mt-3">
            {action && (
              <a
                href={action.href}
                className="inline-flex h-8 items-center rounded-md bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 transition-colors duration-150"
              >
                {action.label}
              </a>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="inline-flex h-8 items-center rounded-md bg-gray-100 dark:bg-gray-800 px-4 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="max-w-sm space-y-4">
        {/* Ícone: usa o emoji existente ou um default clean */}
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mx-auto">
          <span className="text-xl">{icon ?? '—'}</span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">{description}</p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className="flex gap-2 justify-center pt-1">
            {action && (
              <a
                href={action.href}
                className="inline-flex h-8 items-center rounded-md bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 transition-colors duration-150"
              >
                {action.label}
              </a>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="inline-flex h-8 items-center rounded-md bg-gray-100 dark:bg-gray-800 px-4 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Presets mantidos para backward-compat ─────────────────────────────────────

export function EmptyClientes() {
  return <EmptyState icon="👥" title="Nenhum cliente cadastrado" description="Adicione seu primeiro cliente ou importe de planilha." action={{ label: 'Novo cliente', href: '/dashboard/clientes/novo' }} />
}
export function EmptyAgenda() {
  return <EmptyState icon="📅" title="Agenda vazia" description="Nenhum compromisso agendado." action={{ label: 'Ver clientes', href: '/dashboard/clientes' }} />
}
export function EmptyDocumentos() {
  return <EmptyState icon="📄" title="Nenhum documento pendente" description="A documentação aparece conforme os clientes avançam." action={{ label: 'Ver pipeline', href: '/dashboard/funil' }} />
}
export function EmptyFunil() {
  return <EmptyState icon="🏗️" title="Funil de vendas vazio" description="Sem oportunidades no pipeline." action={{ label: 'Novo lead', href: '/dashboard/clientes/novo' }} />
}
export function EmptyFinanceiro() {
  return <EmptyState icon="💰" title="Nenhuma comissão registrada" description="Aparecerão quando vendas são fechadas." />
}
export function EmptyCorretores() {
  return <EmptyState icon="👔" title="Nenhum corretor na equipe" description="Adicione corretores à equipe." action={{ label: 'Gerenciar equipe', href: '/dashboard/equipe' }} />
}
export function EmptyAutomacoes() {
  return <EmptyState icon="⚙️" title="Nenhuma automação configurada" description="Crie regras automáticas." action={{ label: 'Criar automação', href: '/dashboard/automacoes/novo' }} />
}
export function EmptyRelatorios() {
  return <EmptyState icon="📊" title="Sem dados para relatório" description="KPIs aparecem com dados de produção." action={{ label: 'Ver dashboard', href: '/dashboard' }} />
}