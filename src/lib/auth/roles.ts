// ─── RBAC: Perfis e Hierarquia (Sprint 12) ───────────────────────────────────

import type { PerfilUsuario } from '@/src/types'

/** Hierarquia de perfis (nível mais alto = mais poder) */
export const PERFIL_HIERARQUIA: Record<PerfilUsuario, number> = {
  ADMINISTRADOR: 4,
  GERENTE:       3,
  SUPERVISOR:    2,
  CORRETOR:      1,
}

/** Ordenado do maior para o menor */
export const PERFIS_ORDENADOS: PerfilUsuario[] = [
  'ADMINISTRADOR', 'GERENTE', 'SUPERVISOR', 'CORRETOR',
]

/** Labels dos perfis */
export const PERFIL_LABEL: Record<PerfilUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE:       'Gerente',
  SUPERVISOR:    'Supervisor',
  CORRETOR:      'Corretor',
}

/** Verifica se o perfil tem nível suficiente (mínimo exigido) */
export function temNivelMinimo(perfil: PerfilUsuario, minimo: PerfilUsuario): boolean {
  return (PERFIL_HIERARQUIA[perfil] ?? 0) >= (PERFIL_HIERARQUIA[minimo] ?? 0)
}

/** Verifica se é perfil administrativo (ADMIN ou GERENTE) */
export function isAdmin(perfil: PerfilUsuario): boolean {
  return perfil === 'ADMINISTRADOR'
}

/** Verifica se é perfil gerencial (GERENTE ou ADMIN) */
export function isGerente(perfil: PerfilUsuario): boolean {
  return perfil === 'ADMINISTRADOR' || perfil === 'GERENTE'
}

/** Verifica se é perfil de supervisão (SUPERVISOR ou acima) */
export function isSupervisor(perfil: PerfilUsuario): boolean {
  return perfil === 'ADMINISTRADOR' || perfil === 'GERENTE' || perfil === 'SUPERVISOR'
}

/** Perfis permitidos por módulo */
export const PERFIS_POR_MODULO: Record<string, PerfilUsuario[]> = {
  dashboard:    ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  clientes:     ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  agenda:       ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  pipeline:     ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  documentos:   ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  followup:     ['CORRETOR', 'GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  financeiro:    ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  gestao:       ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  operacao:     ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  corretores:   ['GERENTE', 'ADMINISTRADOR'],
  equipe:       ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  rankings:     ['GERENTE', 'ADMINISTRADOR', 'SUPERVISOR'],
  relatorios:   ['GERENTE', 'ADMINISTRADOR'],
  empreendimentos: ['GERENTE', 'ADMINISTRADOR'],
}