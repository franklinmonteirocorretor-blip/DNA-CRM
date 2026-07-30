import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

let testUserId: string | null = null
let testClientId: string | null = null

describe('Integração — Cadastro e Edição de Cliente', () => {
  beforeAll(async () => {
    // Buscar um usuário existente para usar como corretor
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, perfil')
      .eq('perfil', 'CORRETOR')
      .limit(1)

    if (usuarios && usuarios.length > 0) {
      testUserId = usuarios[0].id
    } else {
      // Fallback: pega qualquer usuário
      const { data: anyUser } = await supabaseAdmin
        .from('usuarios')
        .select('id, email, perfil')
        .limit(1)
      if (anyUser && anyUser.length > 0) {
        testUserId = anyUser[0].id
      }
    }

    expect(testUserId).toBeDefined()
  })

  afterAll(async () => {
    if (testClientId) {
      await supabaseAdmin.from('clientes').delete().eq('id', testClientId)
    }
  })

  it('cadastra um novo cliente via Supabase', async () => {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert({
        nome: 'Cliente Integração Teste',
        cpf: '00000000191',
        telefone: '(11) 90000-0001',
        email: `cli-teste-${Date.now()}@email.com`,
        etapa_atual: 'NOVO_LEAD',
        corretor_responsavel_id: testUserId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeDefined()
    testClientId = data!.id
  })

  it('consulta cliente cadastrado', async () => {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('id', testClientId)
      .single()

    expect(error).toBeNull()
    expect(data?.nome).toBe('Cliente Integração Teste')
    expect(data?.etapa_atual).toBe('NOVO_LEAD')
  })

  it('edita o nome do cliente', async () => {
    const { error } = await supabaseAdmin
      .from('clientes')
      .update({ nome: 'Cliente Editado Teste' })
      .eq('id', testClientId)

    expect(error).toBeNull()

    const { data } = await supabaseAdmin
      .from('clientes')
      .select('nome')
      .eq('id', testClientId)
      .single()

    expect(data?.nome).toBe('Cliente Editado Teste')
  })

  it('move cliente de etapa no pipeline', async () => {
    const { error } = await supabaseAdmin
      .from('clientes')
      .update({ etapa_atual: 'CONTATOS' })
      .eq('id', testClientId)

    expect(error).toBeNull()

    const { data } = await supabaseAdmin
      .from('clientes')
      .select('etapa_atual')
      .eq('id', testClientId)
      .single()

    expect(data?.etapa_atual).toBe('CONTATOS')
  })

  it('lista clientes em um determinado etapa', async () => {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('id, etapa_atual')
      .eq('etapa_atual', 'CONTATOS')
      .limit(10)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    const encontrado = data?.find((c) => c.id === testClientId)
    expect(encontrado).toBeDefined()
  })
})