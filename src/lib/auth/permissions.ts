// ─── RBAC - Matriz de Permissões (Sprint 12) ─────────────────────────────────

import type { PerfilUsuario } from '@/src/types'

/** Ações possíveis por recurso */
export type Acao =
  | 'criar' | 'editar' | 'excluir' | 'visualizar'
  | 'cancelar' | 'confirmar'
  | 'enviar' | 'aprovar' | 'rejeitar'
  | 'mover_etapa'
  | 'confirmar_recebimento'
  | 'cadastrar' | 'desativar' | 'transferir_carteira'

/** Recurso (módulo) do sistema */
export type Recurso =
  | 'clientes'
  | 'agenda'
  | 'documentos'
  | 'pipeline'
  | 'financeiro'
  | 'corretores'
  | 'gestao'
  | 'operacao'
  | 'dashboard'
  | 'equipe'
  | 'rankings'
  | 'relatorios'
  | 'empreendimentos'

/** Definição de permissão: Recurso + Ação */
export interface Permissao {
  recurso: Recurso
  acao: Acao
}

/** Matriz completa: quais ações cada perfil pode executar em cada recurso */
export const MATRIZ_PERMISSOES: Record<PerfilUsuario, Permissao[]> = {
  ADMINISTRADOR: [
    // Acesso total — todas as ações em todos os recursos
    ...gerarTodasPermissoes(),
  ],

  GERENTE: [
    // Clientes
    { recurso: 'clientes', acao: 'criar' },
    { recurso: 'clientes', acao: 'editar' },
    { recurso: 'clientes', acao: 'excluir' },
    { recurso: 'clientes', acao: 'visualizar' },
    // Agenda
    { recurso: 'agenda', acao: 'criar' },
    { recurso: 'agenda', acao: 'editar' },
    { recurso: 'agenda', acao: 'cancelar' },
    { recurso: 'agenda', acao: 'confirmar' },
    // Documentos
    { recurso: 'documentos', acao: 'enviar' },
    { recurso: 'documentos', acao: 'aprovar' },
    { recurso: 'documentos', acao: 'rejeitar' },
    { recurso: 'documentos', acao: 'excluir' },
    // Pipeline
    { recurso: 'pipeline', acao: 'mover_etapa' },
    { recurso: 'pipeline', acao: 'editar' },
    { recurso: 'pipeline', acao: 'visualizar' },
    // Financeiro
    { recurso: 'financeiro', acao: 'visualizar' },
    { recurso: 'financeiro', acao: 'editar' },
    { recurso: 'financeiro', acao: 'confirmar_recebimento' },
    // Corretores
    { recurso: 'corretores', acao: 'cadastrar' },
    { recurso: 'corretores', acao: 'editar' },
    { recurso: 'corretores', acao: 'desativar' },
    { recurso: 'corretores', acao: 'transferir_carteira' },
    // Gestão
    { recurso: 'gestao', acao: 'visualizar' },
    // Operação
    { recurso: 'operacao', acao: 'visualizar' },
    // Dashboard
    { recurso: 'dashboard', acao: 'visualizar' },
    // Equipe
    { recurso: 'equipe', acao: 'visualizar' },
    // Rankings
    { recurso: 'rankings', acao: 'visualizar' },
    // Relatórios
    { recurso: 'relatorios', acao: 'visualizar' },
    // Empreendimentos
    { recurso: 'empreendimentos', acao: 'criar' },
    { recurso: 'empreendimentos', acao: 'editar' },
    { recurso: 'empreendimentos', acao: 'excluir' },
  ],

  SUPERVISOR: [
    // Clientes - só visualizar e editar da equipe
    { recurso: 'clientes', acao: 'visualizar' },
    { recurso: 'clientes', acao: 'editar' },
    // Agenda - criar e editar
    { recurso: 'agenda', acao: 'criar' },
    { recurso: 'agenda', acao: 'editar' },
    { recurso: 'agenda', acao: 'cancelar' },
    { recurso: 'agenda', acao: 'confirmar' },
    // Documentos - enviar e aprovar da equipe
    { recurso: 'documentos', acao: 'enviar' },
    { recurso: 'documentos', acao: 'aprovar' },
    { recurso: 'documentos', acao: 'rejeitar' },
    // Pipeline
    { recurso: 'pipeline', acao: 'mover_etapa' },
    { recurso: 'pipeline', acao: 'visualizar' },
    // Financeiro
    { recurso: 'financeiro', acao: 'visualizar' },
    // Gestão
    { recurso: 'equipe', acao: 'visualizar' },
    // Dashboard
    { recurso: 'dashboard', acao: 'visualizar' },
    // Follow-up
    { recurso: 'dashboard', acao: 'visualizar' }, // follow-up incluso no dashboard
  ],

  CORRETOR: [
    // Clientes próprios
    { recurso: 'clientes', acao: 'criar' },
    { recurso: 'clientes', acao: 'editar' },
    { recurso: 'clientes', acao: 'visualizar' },
    // Agenda própria
    { recurso: 'agenda', acao: 'criar' },
    { recurso: 'agenda', acao: 'editar' },
    { recurso: 'agenda', acao: 'cancelar' },
    // Documentos próprios
    { recurso: 'documentos', acao: 'enviar' },
    // Pipeline próprio
    { recurso: 'pipeline', acao: 'mover_etapa' },
    { recurso: 'pipeline', acao: 'visualizar' },
    // Dashboard
    { recurso: 'dashboard', acao: 'visualizar' },
  ],
}

function gerarTodasPermissoes(): Permissao[] {
  const recursos: Recurso[] = [
    'clientes', 'agenda', 'documentos', 'pipeline', 'financeiro',
    'corretores', 'gestao', 'operacao', 'dashboard', 'equipe',
    'rankings', 'relatorios', 'empreendimentos',
  ]
  const acoes: Acao[] = [
    'criar', 'editar', 'excluir', 'visualizar', 'cancelar', 'confirmar',
    'enviar', 'aprovar', 'rejeitar', 'mover_etapa',
    'confirmar_recebimento', 'cadastrar', 'desativar', 'transferir_carteira',
  ]
  const resultado: Permissao[] = []
  for (const recurso of recursos) {
    for (const acao of acoes) {
      resultado.push({ recurso, acao })
    }
  }
  return resultado
}

/** Verifica se um perfil tem uma permissão específica */
export function temPermissao(perfil: PerfilUsuario, recurso: Recurso, acao: Acao): boolean {
  const permissoes = MATRIZ_PERMISSOES[perfil] ?? []
  return permissoes.some((p) => p.recurso === recurso && p.acao === acao)
}

/** Lista todas as ações que um perfil pode executar em um recurso */
export function getAcoesPermitidas(perfil: PerfilUsuario, recurso: Recurso): Acao[] {
  const permissoes = MATRIZ_PERMISSOES[perfil] ?? []
  return permissoes.filter((p) => p.recurso === recurso).map((p) => p.acao)
}

/** Verbos HTTP mapeados para ações */
export const ACAO_PARA_VERBO: Record<Acao, string[]> = {
  criar:                  ['POST'],
  editar:                 ['PUT', 'PATCH'],
  excluir:                ['DELETE'],
  visualizar:             ['GET'],
  cancelar:               ['PUT', 'PATCH'],
  confirmar:              ['PUT', 'PATCH'],
  enviar:                 ['POST'],
  aprovar:                ['PUT', 'PATCH'],
  rejeitar:               ['PUT', 'PATCH'],
  mover_etapa:            ['PUT', 'PATCH'],
  confirmar_recebimento:  ['PUT', 'PATCH'],
  cadastrar:             ['POST'],
  desativar:             ['PUT', 'PATCH'],
  transferir_carteira:   ['POST'],
}