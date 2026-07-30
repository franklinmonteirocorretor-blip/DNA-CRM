// DNA CRM — RC2: Config centralizada de rotas da aplicação
// Single source of truth para proxy.ts, layouts, e verificações de permissão

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
  '/test-supabase',
] as const

/** Rotas restritas ao perfil ADMINISTRADOR */
export const ADMIN_ROUTES = [
  '/dashboard/corretores',
  '/dashboard/gestao',
] as const

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