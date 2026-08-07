// DNA CRM — RC2: Config centralizada de rotas da aplicação
// Single source of truth para proxy.ts, layouts, e verificações de permissão

import type { PerfilUsuario } from '@/src/types'

/** Todas as rotas que exigem autenticação */
export const PROTECTED_ROUTES = [
  '/dashboard',
  '/clientes',
  '/agenda',
  '/documentos',
  '/ranking',
] as const

/** Rotas públicas (não exigem autenticação) */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/callback',
  '/api/health',
  // Cron de automações — autenticado por CRON_SECRET dentro da rota
  '/api/cron/automacao',
] as const

/** Perfil mínimo exigido por rota (RBAC no middleware — defesa em profundidade) */
export const ROLE_ROUTES: Record<string, PerfilUsuario> = {
  // Gestão e supervisão (alinhado a PERFIS_POR_MODULO)
  '/dashboard/bi': 'SUPERVISOR',
  '/dashboard/operacao': 'SUPERVISOR',
  '/dashboard/rankings': 'SUPERVISOR',
  '/dashboard/financeiro': 'SUPERVISOR',
  '/dashboard/equipe': 'SUPERVISOR',
  '/dashboard/gestao': 'SUPERVISOR',
  // Gerência
  '/dashboard/corretores': 'GERENTE',
  '/dashboard/relatorios': 'GERENTE',
  '/dashboard/empreendimentos': 'GERENTE',
  '/dashboard/automacoes': 'GERENTE',
}

/** Todas as sub-rotas do dashboard (usado pelo middleware e pelo layout) */
export const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/clientes',
  '/dashboard/agenda',
  '/dashboard/funil',
  '/dashboard/followup',
  '/dashboard/gestao',
  '/dashboard/equipe',
  '/dashboard/corretores',
  '/dashboard/empreendimentos',
  '/dashboard/rankings',
  '/dashboard/relatorios',
  '/dashboard/documentos',
  '/dashboard/financeiro',
  '/dashboard/automacoes',
  '/dashboard/operacao',
] as const