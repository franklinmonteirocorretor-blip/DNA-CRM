// ─── Perfis e Permissões ───────────────────────────────────────────────────────
// Sprint 10 — centraliza mapeamentos de perfil e status

import type { PerfilUsuario, StatusUsuario } from '@/src/types'

/** Labels dos perfis de usuário */
export const PERFIL_LABELS: Record<PerfilUsuario, string> = {
  CORRETOR: 'Corretor',
  GERENTE: 'Gerente',
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
}

/** Labels dos status de usuário */
export const STATUS_USUARIO_LABELS: Record<StatusUsuario, string> = {
  ATIVO: 'Ativo',
  FERIAS: 'Férias',
  AFASTADO: 'Afastado',
  DESLIGADO: 'Desligado',
}

/** Configuração visual dos status (badge) */
export const STATUS_USUARIO_VISUAL: Record<StatusUsuario, { cor: string; label: string }> = {
  ATIVO:     { cor: 'bg-emerald-100 text-emerald-700', label: 'Ativo' },
  FERIAS:    { cor: 'bg-amber-100 text-amber-700',     label: 'Férias' },
  AFASTADO:  { cor: 'bg-red-100 text-red-700',         label: 'Afastado' },
  DESLIGADO: { cor: 'bg-gray-100 text-gray-500',       label: 'Desligado' },
}

/** Quais perfis podem acessar cada módulo */
export const PERMISSOES_MODULO: Record<string, PerfilUsuario[]> = {
  dashboard:         ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  funil:             ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  clientes:          ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  agenda:            ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  documentos:        ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  operacao:          ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  gestao:            ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  corretores:        ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  equipe:            ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  followup:          ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
}