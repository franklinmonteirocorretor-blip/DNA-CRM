'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'
import { Usuario } from '@/src/types'
import { User } from '@supabase/supabase-js'

interface UseAuthReturn {
  user: User | null
  usuario: Usuario | null
  loading: boolean
  signOut: () => Promise<void>
}

// Hook para acessar o estado de autenticação em Client Components.
// Exemplo de uso:
//   const { user, usuario, loading } = useAuth()
//   if (loading) return <p>Carregando...</p>
//   if (!user) return <p>Não logado</p>
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUsuario(data ?? null)
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    })

    // Escuta mudanças de autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUsuario(data ?? null)
          })
      } else {
        setUsuario(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUsuario(null)
  }

  return { user, usuario, loading, signOut }
}