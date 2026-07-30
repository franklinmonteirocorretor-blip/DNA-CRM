import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

let testClientId: string | null = null
let testUserId: string | null = null

describe('Integração — Documentos e Agendamento', () => {
  beforeAll(async () => {
    // Buscar um usuário existente para usar como corretor
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, perfil')
      .limit(1)

    if (usuarios && usuarios.length > 0) {
      testUserId = usuarios[0].id
    } else {
      // Criar usuário de fallback
      const { data: user } = await supabaseAdmin.auth.admin.createUser({
        email: `docs-fallback-${Date.now()}@dnaimoveis.com`,
        password: 'teste123',
        email_confirm: true,
      })
      if (user.user) {
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

    // Criar o cliente de teste
    const { data: cliente, error: clienteErr } = await supabaseAdmin
      .from('clientes')
      .insert({
        nome: 'Cliente Docs Teste',
        telefone: '(11) 90000-0002',
        email: `docs-teste-${Date.now()}@email.com`,
        etapa_atual: 'ANALISE',
        corretor_responsavel_id: testUserId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (clienteErr) {
      console.error('Erro ao criar cliente docs:', clienteErr)
    }

    expect(cliente?.id).toBeDefined()
    testClientId = cliente!.id
  })

  afterAll(async () => {
    if (testClientId) {
      await supabaseAdmin.from('agendamentos').delete().eq('cliente_id', testClientId)
      await supabaseAdmin.from('documentos').delete().eq('cliente_id', testClientId)
      await supabaseAdmin.from('clientes').delete().eq('id', testClientId)
    }
  })

  it('cria um registro de documento para o cliente', async () => {
    const { data, error } = await supabaseAdmin
      .from('documentos')
      .insert({
        cliente_id: testClientId,
        tipo: 'RG',
        status_validacao: 'PENDENTE',
        enviado_por: testUserId,
        arquivo_url: 'https://example.com/doc-teste.pdf',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeDefined()
  })

  it('atualiza status do documento para VALIDADO', async () => {
    const { data: docs } = await supabaseAdmin
      .from('documentos')
      .select('id')
      .eq('cliente_id', testClientId)
      .limit(1)

    const docId = docs?.[0]?.id
    expect(docId).toBeDefined()

    const { error } = await supabaseAdmin
      .from('documentos')
      .update({ status_validacao: 'VALIDADO' })
      .eq('id', docId)

    expect(error).toBeNull()
  })

  it('cria agendamento para o cliente', async () => {
    const dataVisita = new Date(Date.now() + 86400000 * 2).toISOString()
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .insert({
        cliente_id: testClientId,
        data_hora: dataVisita,
        status: 'AGENDADO',
        corretor_id: testUserId,
      })
      .select('id, status')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeDefined()
    expect(data?.status).toBe('AGENDADO')
  })

  it('confirma o agendamento', async () => {
    const { data: agendamentos } = await supabaseAdmin
      .from('agendamentos')
      .select('id')
      .eq('cliente_id', testClientId)
      .limit(1)

    const agId = agendamentos?.[0]?.id
    expect(agId).toBeDefined()

    const { error } = await supabaseAdmin
      .from('agendamentos')
      .update({ status: 'CONFIRMADO' })
      .eq('id', agId)

    expect(error).toBeNull()
  })

  it('lista agendamentos do cliente', async () => {
    const { data, error } = await supabaseAdmin
      .from('agendamentos')
      .select('*')
      .eq('cliente_id', testClientId)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThanOrEqual(1)
  })
})