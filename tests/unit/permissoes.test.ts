import { describe, it, expect } from 'vitest'
import {
  temPermissao,
  getAcoesPermitidas,
  MATRIZ_PERMISSOES,
  ACAO_PARA_VERBO,
} from '@/src/lib/auth/permissions'
import {
  temNivelMinimo,
  isAdmin,
  isGerente,
  isSupervisor,
  PERFIS_POR_MODULO,
} from '@/src/lib/auth/roles'

describe('Permissões — RBAC', () => {
  describe('Matriz de Permissões', () => {
    it('ADMIN tem todas as permissões', () => {
      const admin = MATRIZ_PERMISSOES['ADMINISTRADOR']
      expect(admin.length).toBeGreaterThan(50)
      const recursos = new Set(admin.map((p) => p.recurso))
      expect(recursos.has('clientes')).toBe(true)
      expect(recursos.has('financeiro')).toBe(true)
    })

    it('CORRETOR não tem acesso a financeiro', () => {
      const perms = MATRIZ_PERMISSOES['CORRETOR']
      const recursos = perms.map((p) => p.recurso)
      expect(recursos).not.toContain('financeiro')
    })
  })

  describe('temPermissao', () => {
    it('ADMIN pode criar clientes', () => {
      expect(temPermissao('ADMINISTRADOR', 'clientes', 'criar')).toBe(true)
    })

    it('ADMIN pode visualizar financeiro', () => {
      expect(temPermissao('ADMINISTRADOR', 'financeiro', 'visualizar')).toBe(true)
    })

    it('CORRETOR pode criar clientes', () => {
      expect(temPermissao('CORRETOR', 'clientes', 'criar')).toBe(true)
    })

    it('CORRETOR NÃO pode visualizar financeiro', () => {
      expect(temPermissao('CORRETOR', 'financeiro', 'visualizar')).toBe(false)
    })

    it('SUPERVISOR não pode cadastrar corretores', () => {
      expect(temPermissao('SUPERVISOR', 'corretores', 'cadastrar')).toBe(false)
    })
  })

  describe('getAcoesPermitidas', () => {
    it('GERENTE tem ações em financeiro', () => {
      const acoes = getAcoesPermitidas('GERENTE', 'financeiro')
      expect(acoes).toContain('visualizar')
      expect(acoes).toContain('editar')
      expect(acoes).toContain('confirmar_recebimento')
    })

    it('CORRETOR pode mover etapa no pipeline', () => {
      const acoes = getAcoesPermitidas('CORRETOR', 'pipeline')
      expect(acoes).toContain('mover_etapa')
    })
  })

  describe('ACAO_PARA_VERBO', () => {
    it('criar mapeia POST', () => {
      expect(ACAO_PARA_VERBO['criar']).toContain('POST')
    })
    it('visualizar mapeia GET', () => {
      expect(ACAO_PARA_VERBO['visualizar']).toContain('GET')
    })
    it('excluir mapeia DELETE', () => {
      expect(ACAO_PARA_VERBO['excluir']).toContain('DELETE')
    })
    it('editar mapeia PUT e PATCH', () => {
      expect(ACAO_PARA_VERBO['editar']).toContain('PUT')
      expect(ACAO_PARA_VERBO['editar']).toContain('PATCH')
    })
  })

  describe('Hierarquia de Perfis', () => {
    it('ADMIN nível >= todos', () => {
      expect(temNivelMinimo('ADMINISTRADOR', 'CORRETOR')).toBe(true)
      expect(temNivelMinimo('ADMINISTRADOR', 'GERENTE')).toBe(true)
      expect(temNivelMinimo('ADMINISTRADOR', 'ADMINISTRADOR')).toBe(true)
    })

    it('CORRETOR não tem nível de GERENTE', () => {
      expect(temNivelMinimo('CORRETOR', 'GERENTE')).toBe(false)
    })

    it('isAdmin só para ADMINISTRADOR', () => {
      expect(isAdmin('ADMINISTRADOR')).toBe(true)
      expect(isAdmin('GERENTE')).toBe(false)
    })

    it('isGerente para ADMIN e GERENTE', () => {
      expect(isGerente('ADMINISTRADOR')).toBe(true)
      expect(isGerente('GERENTE')).toBe(true)
      expect(isGerente('CORRETOR')).toBe(false)
    })

    it('isSupervisor para ADMIN, GERENTE e SUPERVISOR', () => {
      expect(isSupervisor('ADMINISTRADOR')).toBe(true)
      expect(isSupervisor('GERENTE')).toBe(true)
      expect(isSupervisor('SUPERVISOR')).toBe(true)
      expect(isSupervisor('CORRETOR')).toBe(false)
    })
  })

  describe('PERFIS_POR_MODULO', () => {
    it('dashboard inclui todos os perfis', () => {
      expect(PERFIS_POR_MODULO.dashboard).toContain('CORRETOR')
      expect(PERFIS_POR_MODULO.dashboard).toContain('ADMINISTRADOR')
    })

    it('corretores apenas ADMIN e GERENTE', () => {
      expect(PERFIS_POR_MODULO.corretores).not.toContain('CORRETOR')
      expect(PERFIS_POR_MODULO.corretores).toContain('ADMINISTRADOR')
      expect(PERFIS_POR_MODULO.corretores).toContain('GERENTE')
    })

    it('financeiro não inclui CORRETOR', () => {
      expect(PERFIS_POR_MODULO.financeiro).not.toContain('CORRETOR')
    })
  })
})