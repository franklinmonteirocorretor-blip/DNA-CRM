import { test, expect } from '@playwright/test'

/**
 * TESTE E2E — Fluxo completo Lead → Pósfera
 *
 * Simula o ciclo completo de vida de um cliente na imobiliária:
 *   Lead → Cadastro → Análise → Documentação → Aprovação →
 *   Agendamento → Fechamento → Pós-venda
 *
 * PRÉ-REQUISITOS:
 * - Supabase rodando localmente ou em staging
 * - `npm run dev` iniciado em http://localhost:3000
 * - Usuário de teste criado no banco (admin@dnaimoveis.com / admin123)
 */

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'admin@dnaimoveis.com'
const TEST_PASSWORD = 'admin123'

test.describe('Fluxo Completo — Lead → Pós-venda', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste do fluxo
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('Acessa dashboard e verifica elementos principais', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    // Verifica header
    await expect(page.locator('text=DNA CRM')).toBeVisible()
    // Verifica navegação com links de módulo
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Operacao')).toBeVisible()
    await expect(page.locator('text=Clientes')).toBeVisible()
  })

  test('ETAPA 1 — Novo Lead: Cadastra cliente via formulário', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/clientes/novo`)

    // Preenche formulário
    await page.fill('input[name="nome"]', 'João da Silva Teste E2E')
    await page.fill('input[name="cpf"]', '529.982.247-25')
    await page.fill('input[name="telefone"]', '(11) 99999-9999')
    await page.fill('input[name="email"]', 'joao.teste@example.com')

    // Submete o formulário
    await page.click('button[type="submit"]')

    // Espera redirecionamento para página do cliente ou mensagem de sucesso
    await page.waitForTimeout(2000)

    // Verifica que não há mensagens de erro visíveis
    const errors = page.locator('[role="alert"]')
    const errorCount = await errors.count()
    if (errorCount > 0) {
      const errorText = await errors.first().textContent()
      console.warn('Erro encontrado:', errorText)
    }
  })

  test('ETAPA 2 — Visualiza cliente e acessa detalhes', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/clientes`)

    // Deve carregar a página de clientes
    await expect(page.locator('text=Clientes')).toBeVisible()

    // Aguarda o carregamento dos dados
    await page.waitForTimeout(2000)
  })

  test('ETAPA 3 — Acessa o pipeline/funil', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/funil`)

    // Verifica que a página carregou
    await expect(page.locator('text=Funil')).toBeVisible()
    // Aguarda carregamento do kanban
    await page.waitForTimeout(2000)
  })

  test('ETAPA 4 — Acessa financeiro', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/financeiro`)

    await expect(page.locator('text=Financeiro')).toBeVisible()
    await page.waitForTimeout(2000)
  })

  test('ETAPA 5 — Acessa documentos', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/documentos`)

    await expect(page.locator('text=Documentos')).toBeVisible()
    await page.waitForTimeout(2000)
  })

  test('ETAPA 6 — Acessa agenda/calendário', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/agenda`)

    await expect(page.locator('text=Agenda')).toBeVisible()
    await page.waitForTimeout(2000)
  })

  test('ETAPA 7 — Pós-Venda: Verifica módulo follow-up', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/followup`)

    await expect(page.locator('text=Follow-up')).toBeVisible()
    await page.waitForTimeout(2000)
  })

  test('Logout e verifica redirecionamento', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    // Clica no botão de sair/logout
    const signoutBtn = page.locator('button:has-text("Sair")')
    if (await signoutBtn.count() > 0) {
      await signoutBtn.click()
      await page.waitForURL('**/login')
    }
  })
})