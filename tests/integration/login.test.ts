import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Testes de integração — Login/Cadastro
 * Usam Supabase Admin (service_role) diretamente para setup/teardown.
 * Verificam que as credenciais são válidas e o sistema de auth funciona.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const TEST_EMAIL = `teste-integracao-${Date.now()}@dnaimoveis.com`
// Senha gerada dinamicamente — usuário efêmero criado e excluído no afterAll.
// Nenhuma credencial fica hardcoded no repositório.
const TEST_PASSWORD = `Tst!${Math.random().toString(36).slice(2)}${Date.now()}`

describe('Integração — Login e Cadastro', () => {
  afterAll(async () => {
    // Limpa usuário de teste se existir
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const testUser = users?.users.find((u) => u.email === TEST_EMAIL)
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id)
    }
  })

  it('consegue criar um novo usuário via admin API', async () => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    })

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe(TEST_EMAIL)
  })

  it('consegue fazer login com as credenciais criadas', async () => {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    expect(error).toBeNull()
    expect(data.session).toBeDefined()
    expect(data.user?.email).toBe(TEST_EMAIL)
  })

  it('login com senha errada falha', async () => {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: `errada-${Math.random().toString(36).slice(2)}`,
    })

    expect(error).toBeDefined()
    expect(data.session).toBeNull()
  })

  it('logout remove a sessão', async () => {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Primeiro faz login para ter sessão
    await supabaseAnon.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    // Depois desloga
    const { error } = await supabaseAnon.auth.signOut()
    expect(error).toBeNull()

    // Confirma que não tem mais sessão
    const { data } = await supabaseAnon.auth.getSession()
    expect(data.session).toBeNull()
  })

  it('consulta tabela usuarios para ver perfil do usuário', async () => {
    // Com service role (bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .limit(1)

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })
})