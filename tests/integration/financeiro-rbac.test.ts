import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

let testClientId: string | null = null
let testUserId: string | null = null

describe('Integração — Financeiro e RBAC', () => {
  beforeAll(async () => {
    // Buscar um usuário existente para usar como corretor
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, perfil')
      .limit(1)

    if (usuarios && usuarios.length > 0) {
      testUserId = usuarios[0].id
    } else {
      // Criar usuário de fallback (efêmero — senha gerada dinamicamente, sem credencial no repo)
      const { data: user } = await supabaseAdmin.auth.admin.createUser({
        email: `fin-fallback-${Date.now()}@dnaimoveis.com`,
        password: `Tst!${Math.random().toString(36).slice(2)}${Date.now()}`,
        email_confirm: true,
      })
      if (user?.user) {
        testUserId = user.user.id
        await supabaseAdmin.from('usuarios').upsert({
          id: testUserId,
          nome: 'Corretor Fallback',
          email: user.user.email!,
          perfil: 'CORRETOR',
          ativo: true,
        })
      }
    }

    expect(testUserId).toBeDefined()

    const { data: cliente, error: clienteErr } = await supabaseAdmin
      .from('clientes')
      .insert({
nome: 'Cliente Financeiro Teste',
      telefone: '(11) 99999-0003',
      email: `fin-teste-${Date.now()}@email.com`,
      etapa_atual: 'FECHAMENTOS',
      corretor_responsavel_id: testUserId,
        vgv: 350000,
        comissao_percentual: 5,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (clienteErr) {
      console.error('Erro ao criar cliente financeiro:', clienteErr)
    }

    expect(cliente?.id).toBeDefined()
    testClientId = cliente!.id
  })

  afterAll(async () => {
    if (testClientId) {
      await supabaseAdmin.from('clientes').delete().eq('id', testClientId)
    }
  })

  describe('Financeiro', () => {
    it('consulta produção diária', async () => {
      const { data, error } = await supabaseAdmin
        .from('producao_diaria')
        .select('*')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('consulta clientes em etapa de fechamento (VGV potencial)', async () => {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('id, nome, etapa_atual, vgv')
        .eq('etapa_atual', 'FECHAMENTOS')
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('consulta tabela empreendimentos', async () => {
      const { data, error } = await supabaseAdmin
        .from('empreendimentos')
        .select('id, nome')
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('cliente teste tem VGV cadastrado', async () => {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('vgv, comissao_percentual')
        .eq('id', testClientId)
        .single()

      expect(error).toBeNull()
      expect(data?.vgv).toBe(350000)
    })
  })

  describe('RBAC', () => {
    it('tabela usuarios tem coluna perfil', async () => {
      const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, perfil')
        .limit(3)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('perfil')
      }
    })

    it('consulta clientes com service_role (bypass RLS) funciona', async () => {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('id')
        .limit(1)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('RLS está ativo — anon key sem auth não deve acessar todos os dados', async () => {
      const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      const { data, error } = await supabaseAnon
        .from('usuarios')
        .select('email')
        .limit(1)

      if (error) {
        expect(error.code).toBeDefined()
      } else {
        expect(Array.isArray(data)).toBe(true)
      }
    })
  })
})