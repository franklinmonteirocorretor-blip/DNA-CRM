// Tipos globais do DNA CRM
// Todos gerados a partir do schema do banco (0000_producao_completa.sql)

export type PerfilUsuario = 'CORRETOR' | 'GERENTE' | 'ADMINISTRADOR'

export type EtapaFunil =
  | 'NOVO_LEAD'
  | 'CONTATOS'
  | 'AGENDAMENTO'
  | 'COMPARECIMENTO'
  | 'ANALISE'
  | 'RESTRICOES'
  | 'CONDICIONADOS'
  | 'APROVADOS'
  | 'FECHAMENTOS'
  | 'POS_VENDA'

export type ResultadoAnalise = 'RESTRICAO' | 'CONDICIONADO' | 'APROVADO' | 'DOC_PENDENTE'

export type TipoAtividade = 'LIGACAO' | 'WHATSAPP' | 'FOLLOW_UP'

export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'REMARCADO' | 'CANCELADO'

export type ResultadoComparecimento = 'COMPARECEU' | 'NAO_COMPARECEU'

export type TipoDocumento =
  | 'RG'
  | 'CPF'
  | 'CNH'
  | 'COMPROVANTE_RENDA'
  | 'FGTS'
  | 'CONTRATO'
  | 'PROPOSTA_PDF'
  | 'OUTRO'

export type StatusValidacaoDoc = 'PENDENTE' | 'VALIDADO' | 'REJEITADO'

export type AcaoAuditoria = 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO' | 'MUDANCA_ETAPA'

export type TipoNotificacao =
  | 'CLIENTE_PARADO'
  | 'AGENDAMENTO_HOJE'
  | 'AGENDAMENTO_AMANHA'
  | 'DOCUMENTO_PENDENTE'
  | 'POS_VENDA_PRAZO'
  | 'FECHAMENTO_REALIZADO'
  | 'ANALISE_CONCLUIDA'

// === Tabelas do banco ===

export interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string | null
  perfil: PerfilUsuario
  gerente_id: string | null
  avatar_url: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Cliente {
  id: string
  nome: string
  cpf: string
  telefone: string
  email: string | null
  renda: number | null
  dependentes: number
  tempo_clt_meses: number | null
  saldo_fgts: number
  eh_casado: boolean
  etapa_atual: EtapaFunil
  resultado_analise: ResultadoAnalise | null
  ficha_proposta_assinada: boolean
  data_fechamento: string | null
  vgv: number | null
  comissao_percentual: number | null
  comissao_valor: number | null
  imovel_entregue_em: string | null
  corretor_responsavel_id: string
  empreendimento_interesse: string | null
  empreendimento_id: string | null
  proxima_acao: string | null
  proxima_acao_em: string | null
  observacoes: string | null
  ultima_atividade_em: string
  pasta_completa_em: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Conjuge {
  id: string
  cliente_id: string
  nome: string
  cpf: string | null
  renda: number | null
  tempo_clt_meses: number | null
  saldo_fgts: number
  created_at: string
  updated_at: string
}

export interface Atividade {
  id: string
  cliente_id: string
  usuario_id: string
  tipo: TipoAtividade
  resultado: string | null
  observacao: string | null
  created_at: string
}

export interface Agendamento {
  id: string
  cliente_id: string
  corretor_id: string
  empreendimento_interesse: string | null
  empreendimento_id: string | null
  data_hora: string
  status: StatusAgendamento
  created_at: string
  updated_at: string
}

export interface Comparecimento {
  id: string
  agendamento_id: string
  resultado: ResultadoComparecimento
  motivo_ausencia: string | null
  observacao: string | null
  created_at: string
}

export interface Documento {
  id: string
  cliente_id: string
  tipo: TipoDocumento
  arquivo_url: string
  status_validacao: StatusValidacaoDoc
  enviado_por: string
  created_at: string
  deleted_at: string | null
}

export interface ProducaoDiaria {
  id: string
  usuario_id: string
  data: string
  ligacoes: number
  whatsapp: number
  follow_ups: number
  agendamentos: number
  comparecimentos: number
  pastas: number
  comparecimentos_feirao: number
  aprovacoes: number
  vendas: number
  pontuacao_gamificacao: number
}

export interface Empreendimento {
  id: string
  nome: string
  endereco: string | null
  vagas: number
  ativo: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Notificacao {
  id: string
  usuario_id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  link: string | null
  lida: boolean
  created_at: string
}

export interface HistoricoAcao {
  id: number
  usuario_id: string | null
  entidade: string
  entidade_id: string
  acao: AcaoAuditoria
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  observacao: string | null
  created_at: string
}