// Tipos globais do DNA CRM
// Todos gerados a partir do schema do banco (0000_producao_completa.sql)

export type PerfilUsuario = 'CORRETOR' | 'GERENTE' | 'ADMINISTRADOR' | 'SUPERVISOR'

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
  | 'COMPROVANTE_ENDERECO'
  | 'CERTIDAO_NASCIMENTO'
  | 'CERTIDAO_CASAMENTO'
  | 'CERTIDAO_CASAMENTO_AVERBACAO'
  | 'MO_AUTODECLARACAO_DEPENDENTE'
  | 'HOLERITE'
  | 'CARTEIRA_TRABALHO'
  | 'EXTRATO_FGTS'
  | 'DECLARACAO_IR'

export type StatusValidacaoDoc = 'PENDENTE' | 'VALIDADO' | 'REJEITADO' | 'RECEBIDO' | 'EM_ANALISE'

export type AcaoAuditoria = 'CRIACAO' | 'ATUALIZACAO' | 'EXCLUSAO' | 'MUDANCA_ETAPA'

export type StatusUsuario = 'ATIVO' | 'FERIAS' | 'AFASTADO' | 'DESLIGADO'

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
  cpf: string | null
  creci: string | null
  data_admissao: string | null
  cargo: string | null
  supervisor_id: string | null
  status_usuario: StatusUsuario
  equipe_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Equipe {
  id: string
  nome: string
  gerente_id: string | null
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
  entrou_etapa_em: string | null
  tempo_etapas: PipelineTempoEtapa[] | null
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
  local: string | null
  observacao: string | null
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
  de_dependente: boolean
  grau_parentesco: string | null
  observacoes: string | null
  data_aprovacao: string | null
  vencimento: string | null
  versao: number
  atualizado_por: string | null
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

// === Sprint 2 — Módulo Agenda ===

// Evento enriquecido de agendamento para a visualização do calendário
export interface AgendaEvent {
  agendamento: Agendamento
  comparecimento: Comparecimento | null
  cliente: {
    id: string
    nome: string
    telefone: string
    email: string | null
    etapa_atual: EtapaFunil
  }
  corretor: {
    id: string
    nome: string
  }
  empreendimento: {
    id: string
    nome: string
  } | null
}

// View do calendário
export type AgendaView = 'monthly' | 'weekly' | 'daily' | 'list'

// Resumo para o card do Dashboard
export interface AgendaResumo {
  total: number
  confirmados: number
  pendentes: number
  reagendados: number
  atrasados: number
}

// Filtros da agenda
export interface AgendaFiltros {
  corretorId: string | null
  empreendimentoId: string | null
  status: StatusAgendamento | 'COMPARECEU' | 'NAO_COMPARECEU' | null
  dataInicio: string | null
  dataFim: string | null
  clienteBusca: string | null
}

// === Sprint 3 — Gestão Comercial ===

// Seção 1: Resumo da Operação
export interface GestaoResumoOperacao {
  leadsAtivos: number
  clientesAtendimento: number
  agendamentosHoje: number
  comparecimentosHoje: number
  aprovacoesMes: number
  vendasMes: number
  vgvMes: number
  comissaoPrevista: number
  // Sprint 14 — métricas diárias adicionais
  leadsHoje: number
  ligacoesHoje: number
  whatsAppsHoje: number
  followUpsHoje: number
  comissaoRecebida: number
}

// Seção 2: KPIs Diários por corretor
export interface GestaoKPI {
  usuarioId: string
  nome: string
  avatarUrl: string | null
  ligacoes: number
  whatsapps: number
  followUps: number
  agendamentos: number
  comparecimentos: number
  pastas: number
  percentualDiario: number // 0-100
  status: 'META_BATIDA' | 'META_PENDENTE'
}

// Metas oficiais (constantes)
export const KPI_METAS_OFICIAIS = {
  ligacoes: 80,
  whatsapps: 40,
  followUps: 20,
  agendamentos: 2,
  comparecimentos: 2,
  pastas: 1,
} as const

// Seção 3: Ranking
export interface GestaoRankingItem {
  posicao: number
  usuarioId: string
  nome: string
  avatarUrl: string | null
  pontuacao: number
  vendas: number
  aprovacoes: number
}

export const PONTUACAO_RANKING = {
  venda: 1000,
  aprovacao: 300,
  comparecimento: 120,
  agendamento: 70,
  pasta: 40,
  followUp: 10,
  whatsapp: 3,
  ligacao: 1,
} as const

// Seção 4: Funil Gerencial
export interface GestaoFunilEtapa {
  etapa: EtapaFunil
  label: string
  quantidade: number
  percentual: number // % do total de clientes ativos no funil
  taxaConversao: number | null // % que avançou da etapa anterior; null na primeira
}

// Seção 5: Produtividade
export interface GestaoProducaoSerie {
  data: string
  ligacoes: number
  whatsapps: number
  followUps: number
  agendamentos: number
  comparecimentos: number
  aprovacoes: number
  vendas: number
  pontuacao: number
}

export type GestaoProducaoAgrupamento = 'daily' | 'weekly' | 'monthly'

// Seção 6: Alertas gerenciais
export interface GestaoAlertaClienteParado {
  clienteId: string
  nome: string
  etapa: EtapaFunil
  diasSemContato: number
  corretorNome: string
}

export interface GestaoAlertaAgendamentoPerdido {
  agendamentoId: string
  clienteNome: string
  dataHora: string
  status: StatusAgendamento
  corretorNome: string
}

export interface GestaoAlertaPendenciaDoc {
  clienteId: string
  clienteNome: string
  qtdDocumentosPendentes: number
  etapa: EtapaFunil
}

export interface GestaoAlertaClienteParadoFunil {
  clienteId: string
  nome: string
  etapa: EtapaFunil
  diasNaEtapa: number
  corretorNome: string
}

export interface GestaoAlertaAguardandoRetorno {
  clienteId: string
  nome: string
  proximaAcao: string
  proximaAcaoEm: string
  corretorNome: string
}

export interface GestaoAlertas {
  clientesSemContato3dias: GestaoAlertaClienteParado[]
  agendamentosPerdidos: GestaoAlertaAgendamentoPerdido[]
  pendenciasDocumentais: GestaoAlertaPendenciaDoc[]
  clientesParadosFunil: GestaoAlertaClienteParadoFunil[]
  aguardandoRetorno: GestaoAlertaAguardandoRetorno[]
}

// Seção 7: Metas
export interface GestaoMeta {
  metaEquipe: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number }
  metaIndividual: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number }
  realizadoEquipe: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number }
  realizadoIndividual: { vendas: number; aprovacoes: number; agendamentos: number; comparecimentos: number; pastas: number }
  percentualEquipe: number // 0-100
  percentualIndividual: number // 0-100
  diasRestantes: number
  projecaoFechamento: { vendas: number; vgv: number }
}

// Seção 8: Filtros
export interface GestaoFiltros {
  periodo: 'hoje' | 'semana' | 'mes' | 'personalizado'
  dataInicio: string | null
  dataFim: string | null
  corretorId: string | null
  empreendimentoId: string | null
  equipeId: string | null
}

// === Sprint 4 — Gestão de Corretores e Equipes ===

// Corretor enriquecido (Usuario + KPIs + dados agregados)
export interface CorretorGestao extends Usuario {
  equipeNome: string | null
  supervisorNome: string | null
  // KPIs do mês atual
  kpisMensais: {
    ligacoes: number
    whatsapps: number
    followUps: number
    agendamentos: number
    comparecimentos: number
    pastas: number
    aprovacoes: number
    vendas: number
    vgv: number
    comissao: number
    conversao: number // % de leads → vendas
  }
  metaDiaria: number // percentual 0-100
  metaMensal: number // percentual 0-100
  clientesAtivos: number
}

// Perfil completo do corretor (sub-rota [id])
export interface PerfilCorretor {
  usuario: Usuario
  equipeNome: string | null
  supervisorNome: string | null
  producaoDiaria: { data: string; ligacoes: number; whatsapp: number; followUps: number; agendamentos: number; comparecimentos: number; pastas: number; aprovacoes: number; vendas: number; pontuacao: number }[]
  producaoMensal: { mes: string; vendas: number; vgv: number; comissao: number; aprovacoes: number; pontuacao: number }[]
  producaoAnual: { ano: string; vendas: number; vgv: number; comissao: number; pontuacao: number }[]
  clientes: { id: string; nome: string; etapa: string }[]
  ranking: { posicao: number; pontuacao: number }
  proximosAgendamentos: { id: string; clienteNome: string; dataHora: string; status: string }[]
}

// Filtros da lista de corretores
export interface CorretoresFiltros {
  busca: string | null
  status: StatusUsuario | 'TODOS' | null
  equipeId: string | null
  supervisorId: string | null
  ordenacao: 'nome' | 'admissao' | 'producao' | 'vendas'
}

// Transferência de carteira
export interface TransferenciaCarteira {
  origemId: string
  destinoId: string
  transferirClientes: boolean
  transferirAgendamentos: boolean
  transferirFollowUps: boolean
}

// === Sprint 5 — Pipeline Inteligente ===

// Registro de tempo em uma etapa (armazenado no JSONB tempo_etapas)
export interface PipelineTempoEtapa {
  etapa: EtapaFunil
  data_entrada: string
  data_saida: string
}

// Configuração visual de cada etapa no pipeline
export interface PipelineEtapaConfig {
  etapa: EtapaFunil
  label: string
  cor: string
  icone: string
  descricao: string
  proximaAcaoSugerida: string
  tempoMaximoHoras: number
}

// Card de cliente no pipeline (dados mínimos para o card)
export interface PipelineClienteCard {
  id: string
  nome: string
  telefone: string
  etapaAtual: EtapaFunil
  entrouEtapaEm: string | null
  diasNaEtapa: number
  ultimaAtividadeEm: string | null
  proximaAcao: string | null
  proximaAcaoEm: string | null
  vgv: number | null
  empreendimentoInteresse: string | null
  corretorNome: string
  pendenciaDoc: boolean
  agendamentoProximo: { dataHora: string; status: string } | null
  diasSemContato: number
}

// Dados completos do cliente no painel lateral
export interface PipelineClienteDetalhe {
  id: string
  nome: string
  telefone: string
  email: string | null
  etapaAtual: EtapaFunil
  entrouEtapaEm: string | null
  diasNaEtapa: number
  ultimaAtividadeEm: string | null
  diasSemContato: number
  proximaAcao: string | null
  proximaAcaoEm: string | null
  vgv: number | null
  comissaoValor: number | null
  empreendimentoInteresse: string | null
  empreendimentoNome: string | null
  corretorNome: string
  historicoEtapas: PipelineTempoEtapa[]
  agendamentos: { id: string; dataHora: string; status: string }[]
  documentos: { id: string; tipo: string; status: string }[]
  atividadesRecentes: { tipo: string; resultado: string | null; created_at: string }[]
  pendenciaDoc: boolean
  pendenciaAcao: boolean
}

// KPIs do pipeline
export interface PipelineKPIs {
  clientesAtivos: number
  tempoMedioGeralHoras: number
  conversaoGeral: number // % leads → fechamentos
  vgvTotalNegociacao: number
  vgvPrevisto: number
  comissaoPrevista: number
  tempoPorEtapa: { etapa: EtapaFunil; label: string; tempoMedioHoras: number; quantidade: number }[]
  vgvPorEtapa: { etapa: EtapaFunil; label: string; vgvTotal: number; comissaoTotal: number; quantidade: number }[]
}

// Alertas do pipeline
export interface PipelineAlertas {
  semContato: PipelineClienteCard[]
  paradosNaEtapa: PipelineClienteCard[]
  aguardandoDocumentos: PipelineClienteCard[]
  aguardandoAprovacao: PipelineClienteCard[]
  semProximaAcao: PipelineClienteCard[]
  comVisitaMarcada: PipelineClienteCard[]
}

// Filtros do pipeline
export interface PipelineFiltros {
  etapa: EtapaFunil | null
  corretorId: string | null
  empreendimentoId: string | null
  busca: string | null
}

// === Sprint 7 — Central de Documentos ===

// Checklist de documentos obrigatórios por etapa
export const CHECKLIST_OBRIGATORIO: Partial<Record<EtapaFunil, TipoDocumento[]>> = {
  ANALISE: ['RG', 'CPF', 'COMPROVANTE_RENDA', 'HOLERITE'],
  RESTRICOES: ['RG', 'CPF', 'COMPROVANTE_RENDA', 'EXTRATO_FGTS', 'CARTEIRA_TRABALHO'],
  CONDICIONADOS: ['RG', 'CPF', 'COMPROVANTE_RENDA', 'HOLERITE', 'EXTRATO_FGTS', 'DECLARACAO_IR'],
  APROVADOS: ['RG', 'CPF', 'COMPROVANTE_RENDA', 'COMPROVANTE_ENDERECO'],
  FECHAMENTOS: ['RG', 'CPF', 'COMPROVANTE_RENDA', 'COMPROVANTE_ENDERECO', 'CERTIDAO_NASCIMENTO', 'CERTIDAO_CASAMENTO'],
}

// Labels amigáveis para tipos de documento
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  RG: 'RG', CPF: 'CPF', CNH: 'CNH',
  COMPROVANTE_RENDA: 'Comprovante de Renda', FGTS: 'Extrato FGTS',
  CONTRATO: 'Contrato', PROPOSTA_PDF: 'Proposta',
  OUTRO: 'Outros', COMPROVANTE_ENDERECO: 'Comprovante de Residência',
  CERTIDAO_NASCIMENTO: 'Certidão de Nascimento', CERTIDAO_CASAMENTO: 'Certidão de Casamento',
  CERTIDAO_CASAMENTO_AVERBACAO: 'Certidão Casamento (Averb.)',
  MO_AUTODECLARACAO_DEPENDENTE: 'Autodeclaração Dependente',
  HOLERITE: 'Holerite', CARTEIRA_TRABALHO: 'Carteira de Trabalho',
  EXTRATO_FGTS: 'Extrato FGTS', DECLARACAO_IR: 'Declaração IR',
}

// Painel gerencial de documentos
export interface PainelDocumentos {
  totalClientes: number
  clientesCompleto: number
  clientesPendentes: number
  documentosRejeitados: number
  tempoMedioConferenciaHoras: number
  clientesResumo: {
    clienteId: string
    nome: string
    corretorNome: string
    etapaAtual: EtapaFunil
    docsAprovados: number
    docsPendentes: number
    docsRejeitados: number
    checklistCompleto: boolean
    ultimaAtualizacao: string | null
  }[]
}

// Dossiê completo do cliente (para o componente de checklist)
export interface ClienteDossie {
  clienteId: string
  clienteNome: string
  clienteTelefone: string
  corretorNome: string
  etapaAtual: EtapaFunil
  empreendimentoInteresse: string | null
  checklistObrigatorio: TipoDocumento[]
  documentos: Documento[]
  faltantes: TipoDocumento[]
  checklistCompleto: boolean
  ultimaAtualizacao: string | null
}

// === Sprint 8 — Central do Cliente 360º ===

// Tipo para evento da timeline
export interface Cliente360Evento {
  data: string
  hora: string
  tipo: 'CADASTRO' | 'LIGACAO' | 'WHATSAPP' | 'AGENDAMENTO' | 'COMPARECIMENTO' | 'MUDANCA_ETAPA' | 'DOCUMENTO' | 'ANALISE' | 'OBSERVACAO' | 'CONTRATO' | 'POS_VENDA'
  usuarioNome: string
  descricao: string
  detalhes: string | null
}

// Dados completos 360º
export interface Cliente360 {
  cliente: Cliente
  conjuge: Conjuge | null
  corretorNome: string
  empreendimentoNome: string | null
  timeline: Cliente360Evento[]
  pipeline: { etapa: EtapaFunil; label: string; status: 'concluida' | 'atual' | 'pendente'; tempoHoras: number | null }[]
  agendamentos: { id: string; dataHora: string; status: string; comparecimentoResultado: string | null }[]
  documentos: Documento[]
  checklist: { obrigatorios: TipoDocumento[]; faltantes: TipoDocumento[]; completo: boolean }
  financeiro: {
    vgv: number | null; comissaoValor: number | null; comissaoPercentual: number | null
    renda: number | null; saldoFgts: number; entradaEstimada: number | null; financiamentoEstimado: number | null
    parcelasEstimadas: number | null; subsídio: number | null
  }
  analiseFinanceira: {
    renda: number | null; dependentes: number; tempoCltMeses: number | null
    restricoes: string | null; resultado: string | null
  }
  painelGerencial: {
    tempoTotalFunilHoras: number
    tempoPorEtapa: { etapa: string; horas: number }[]
    totalContatos: number; totalAgendamentos: number; totalComparecimentos: number
    docsPendentes: number; probabilidadeFechamento: number; scoreCliente: number
  }
  diasSemContato: number
  diasNaEtapa: number
}

// === Sprint 9 — Central de Captação e Follow-up ===

/** Item da caixa de entrada */
export interface FollowUpItem {
  id: string
  clienteId: string
  nome: string
  telefone: string
  etapa: string
  etapaLabel: string
  corretorNome: string
  categoria: 'NOVO_LEAD' | 'SEM_CONTATO' | 'AGUARDANDO_RETORNO' | 'VENCIDO' | 'ESQUECIDO'
  diasSemContato: number
  proximaAcao: string | null
  proximaAcaoEm: string | null
  prioridade: number // 0-1000
  statusEmoji: string
  alerta: string | null
}

/** Item de próxima ação agendada */
export interface FollowUpProximaAcao {
  clienteId: string
  nome: string
  acao: string
  dataHora: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  responsavel: string
  tempoRestanteMinutos: number
  etapa: string
}

/** Sugestão inteligente */
export interface FollowUpSugestao {
  clienteId: string
  nome: string
  motivo: string
  sugestao: string
  prioridade: number
}

/** Dados agregados do Follow-up */
export interface FollowUpData {
  caixaEntrada: FollowUpItem[]
  proximasAcoes: FollowUpProximaAcao[]
  painelCorretor: {
    minhasTarefas: number
    meusClientes: number
    followUpsHoje: number
    followUpsAtrasados: number
    tempoMedioRespostaMinutos: number
  }
  painelGerente: {
    clientesEsquecidos: FollowUpItem[]
    corretoresSemFollowUp: string[]
    followUpsHoje: number
    followUpsAtrasados: number
    tempoMedioRespostaMinutos: number
  }
  sugestoes: FollowUpSugestao[]
}