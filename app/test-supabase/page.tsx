'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testando conexão...')

  useEffect(() => {
    async function test() {
      try {
        const { data, error } = await supabase.from('usuarios').select('*').limit(1)
        
        if (error) {
          setStatus('❌ Erro: ' + error.message)
        } else {
          setStatus('✅ Conexão com Supabase funcionando!')
        }
      } catch (err: any) {
        setStatus('❌ Erro: ' + err.message)
      }
    }
    test()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Teste Supabase</h1>
      <p><strong>Status:</strong> {status}</p>
    </div>
  )
}
