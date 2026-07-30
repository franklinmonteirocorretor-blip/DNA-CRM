// ─── RBAC - Hooks Client-Side (Sprint 12) ─────────────────────────────────────
// NUNCA confiar apenas nesses hooks — toda ação deve ser revalidada no servidor.

'use client'

import { useAuth } from '@/src/hooks/useAuth'
import {
  temPermissao,
  getAcoesPermitidas,
  type Recurso,
  type Acao,
} from '@/src/lib/auth/permissions'
import {
  temNivelMinimo,
  isAdmin as checkAdmin,
  isGerente as checkGerente,
  isSupervisor as checkSupervisor,
} from '@/src/lib/auth/roles'
import type { PerfilUsuario } from '@/src/types'
import { useMemo } from 'react'

export interface UsePermissionReturn {
  can: (recurso: Recurso, acao: Acao) => boolean
  getAcoes: (recurso: Recurso) => Acao[]
  perfil: PerfilUsuario | null
  loading: boolean
  isAdmin: boolean
  isGerente: boolean
  isSupervisor: boolean
}

export function usePermission(): UsePermissionReturn {
  const { usuario, loading } = useAuth()
  const perfil = usuario?.perfil ?? null

  const resultado = useMemo(() => {
    if (!perfil) {
      return {
        can: () => false as boolean,
        getAcoes: (): Acao[] => [],
        perfil: null as PerfilUsuario | null,
        isAdmin: false,
        isGerente: false,
        isSupervisor: false,
      }
    }

    return {
      can: (recurso: Recurso, acao: Acao) => temPermissao(perfil, recurso, acao),
      getAcoes: (recurso: Recurso) => getAcoesPermitidas(perfil, recurso),
      perfil,
      isAdmin: checkAdmin(perfil),
      isGerente: checkGerente(perfil),
      isSupervisor: checkSupervisor(perfil),
    }
  }, [perfil])

  return { ...resultado, loading }
}

export function useRole(minimo: PerfilUsuario): boolean {
  const { usuario } = useAuth()
  if (!usuario) return false
  return temNivelMinimo(usuario.perfil, minimo)
}

export function useCan(recurso: Recurso, acao: Acao): boolean {
  const { usuario } = useAuth()
  if (!usuario) return false
  return temPermissao(usuario.perfil, recurso, acao)
}