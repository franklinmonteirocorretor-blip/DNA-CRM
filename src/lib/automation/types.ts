// DNA CRM — Sprint 13: Tipos do motor de automações

/** Eventos que disparam automações */
export type AutomationEvent =
  | 'cliente_criado'
  | 'cliente_editado'
  | 'mudanca_etapa'
  | 'novo_documento'
  | 'documento_aprovado'
  | 'documento_rejeitado'
  | 'agendamento_criado'
  | 'agendamento_confirmado'
  | 'comparecimento'
  | 'venda'
  | 'comissao_recebida'

/** Condições suportadas */
export interface AutomationCondition {
  tipo:
    | 'tempo_parado'
    | 'etapa'
    | 'empreendimento'
    | 'corretor'
    | 'equipe'
    | 'documento_pendente'
    | 'score'
    | 'data'
    | 'status'
  operador: 'igual' | 'diferente' | 'maior' | 'menor' | 'contem' | 'vazio' | 'nao_vazio'
  valor: string | number | null
  /** Opcional: id de referência (ex: etapa específica, empreendimento) */
  referencia?: string
}

/** Ações que o motor pode executar */
export type AutomationAction =
  | 'criar_tarefa'
  | 'criar_alerta'
  | 'atualizar_proxima_acao'
  | 'atualizar_prioridade'
  | 'atualizar_score'
  | 'atualizar_dashboard'
  | 'atualizar_gestao'
  | 'atualizar_operacao'
  | 'atualizar_timeline'
  | 'atualizar_kpis'
  | 'registrar_auditoria'

/** Parametrização da ação */
export interface AutomationActionSpec {
  acao: AutomationAction
  params: Record<string, unknown>
}

/** Registro de automação no banco */
export interface AutomationRecord {
  id: string
  nome: string
  descricao: string | null
  status: 'ATIVA' | 'INATIVA' | 'ERRO'
  prioridade: number
  evento: string
  condicoes: AutomationCondition[]
  acoes: AutomationActionSpec[]
  criado_por: string | null
  criado_em: string
  atualizado_em: string
  ultima_execucao: string | null
  qtd_executada: number
  qtd_falhas: number
  deleted_at: string | null
}

/** Log de execução */
export interface AutomationLog {
  id: string
  automacao_id: string
  evento_disparador: string
  entidade_contexto: string | null
  entidade_id: string | null
  payload: Record<string, unknown>
  condicoes_atendidas: boolean
  acoes_executadas: { acao: AutomationAction; sucesso: boolean; erro?: string }[]
  status: 'PROCESSANDO' | 'SUCESSO' | 'FALHA_PARCIAL' | 'FALHA'
  erro: string | null
  duracao_ms: number | null
  criado_em: string
}

/** Item de fila */
export interface AutomationQueueItem {
  id: string
  evento: AutomationEvent
  payload: Record<string, unknown>
  contexto: Record<string, unknown> | null
  prioridade: number
  tentativas: number
  max_tentativas: number
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'FALHA'
  erro: string | null
  criado_em: string
  processado_em: string | null
}

/** Payload padrão do evento */
export interface AutomationEventPayload {
  evento: AutomationEvent
  entidade: string
  entidade_id: string
  dados: Record<string, unknown>
  timestamp: string
}

/** Status da automação para o dashboard */
export interface AutomationDashboardData {
  automacoes: AutomationRecord[]
  ativas: number
  ultimas_execucoes: AutomationLog[]
  falhas: AutomationLog[]
  fila: AutomationQueueItem[]
  total_fila: number
}