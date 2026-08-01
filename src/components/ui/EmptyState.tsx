// DNA CRM — RC1: Componente Empty State reutilizável
// Usado quando uma lista/tabela está vazia.

import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
}

const DEFAULT_ICON = '📭'

export function EmptyState({
  icon = DEFAULT_ICON,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 py-12">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          {action && (
            <a
              href={action.href}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {action.label}
            </a>
          )}
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────── Presets específicos para cada tela ───────

export function EmptyClientes() {
  return (
    <EmptyState
      icon="👥"
      title="Nenhum cliente cadastrado"
      description="Comece adicionando seu primeiro cliente. Você pode importar de uma planilha ou cadastrar manualmente."
      action={{ label: 'Novo cliente', href: '/dashboard/clientes/novo' }}
    />
  )
}

export function EmptyAgenda() {
  return (
    <EmptyState
      icon="📅"
      title="Agenda vazia"
      description="Nenhum compromisso agendado para hoje ou para o futuro. Agende uma visita ou follow-up com um cliente."
      action={{ label: 'Ver clientes', href: '/dashboard/clientes' }}
      secondaryAction={{ label: 'Ir para o funil', href: '/dashboard/funil' }}
    />
  )
}

export function EmptyDocumentos() {
  return (
    <EmptyState
      icon="📄"
      title="Nenhum documento pendente"
      description="Sem documentos para análise no momento. A documentação aparece aqui conforme os clientes avançam no funil."
      action={{ label: 'Ver pipeline', href: '/dashboard/funil' }}
    />
  )
}

export function EmptyFunil() {
  return (
    <EmptyState
      icon="🏗️"
      title="Funil de vendas vazio"
      description="O pipeline comercial ainda não tem oportunidades ativas. Capture novos leads para começar."
      action={{ label: 'Novo lead', href: '/dashboard/clientes/novo' }}
    />
  )
}

export function EmptyFinanceiro() {
  return (
    <EmptyState
      icon="💰"
      title="Nenhuma comissão registrada"
      description="As comissões aparecem automaticamente quando vendas são fechadas (ficha de proposta assinada)."
    />
  )
}

export function EmptyCorretores() {
  return (
    <EmptyState
      icon="👔"
      title="Nenhum corretor na equipe"
      description="Adicione corretores à sua equipe para gerenciar carteiras e produção."
      action={{ label: 'Gerenciar equipe', href: '/dashboard/equipe' }}
    />
  )
}

export function EmptyAutomacoes() {
  return (
    <EmptyState
      icon="⚙️"
      title="Nenhuma automação configurada"
      description="Crie regras automáticas para tarefas repetitivas — por exemplo: 'se novo cliente, então atribuir corretor'."
      action={{ label: 'Criar automação', href: '/dashboard/automacoes/novo' }}
    />
  )
}

export function EmptyRelatorios() {
  return (
    <EmptyState
      icon="📊"
      title="Sem dados para relatório"
      description="Os KPIs aparecerão aqui quando houver dados suficientes de produção e pipeline."
      action={{ label: 'Ver dashboard', href: '/dashboard' }}
    />
  )
}