# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxo-completo.spec.ts >> Fluxo Completo — Lead → Pós-venda >> ETAPA 2 — Visualiza cliente e acessa detalhes
- Location: tests\e2e\fluxo-completo.spec.ts:64:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "DNA CRM" [level=1] [ref=e5]
      - paragraph [ref=e6]: Entre com sua conta para acessar o sistema
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: E-mail
        - textbox "E-mail" [ref=e10]:
          - /placeholder: seu@email.com
      - generic [ref=e11]:
        - generic [ref=e12]: Senha
        - textbox "Senha" [ref=e13]:
          - /placeholder: ••••••
      - button "Entrar" [ref=e14]
    - paragraph [ref=e16]:
      - text: Não tem conta? Preencha e-mail e senha acima e clique em
      - button "Criar conta" [ref=e17]
  - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]
  - alert [ref=e27]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | /**
  4   |  * TESTE E2E — Fluxo completo Lead → Pósfera
  5   |  *
  6   |  * Simula o ciclo completo de vida de um cliente na imobiliária:
  7   |  *   Lead → Cadastro → Análise → Documentação → Aprovação →
  8   |  *   Agendamento → Fechamento → Pós-venda
  9   |  *
  10  |  * PRÉ-REQUISITOS:
  11  |  * - Supabase rodando localmente ou em staging
  12  |  * - `npm run dev` iniciado em http://localhost:3000
  13  |  * - Usuário de teste criado no banco (admin@dnaimoveis.com / admin123)
  14  |  */
  15  | 
  16  | const BASE_URL = 'http://localhost:3000'
  17  | const TEST_EMAIL = 'admin@dnaimoveis.com'
  18  | const TEST_PASSWORD = 'admin123'
  19  | 
  20  | test.describe('Fluxo Completo — Lead → Pós-venda', () => {
  21  |   test.beforeEach(async ({ page }) => {
  22  |     // Login antes de cada teste do fluxo
  23  |     await page.goto(`${BASE_URL}/login`)
> 24  |     await page.fill('input[name="email"]', TEST_EMAIL)
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  25  |     await page.fill('input[name="password"]', TEST_PASSWORD)
  26  |     await page.click('button[type="submit"]')
  27  |     await page.waitForURL('**/dashboard')
  28  |   })
  29  | 
  30  |   test('Acessa dashboard e verifica elementos principais', async ({ page }) => {
  31  |     await page.goto(`${BASE_URL}/dashboard`)
  32  |     // Verifica header
  33  |     await expect(page.locator('text=DNA CRM')).toBeVisible()
  34  |     // Verifica navegação com links de módulo
  35  |     await expect(page.locator('text=Dashboard')).toBeVisible()
  36  |     await expect(page.locator('text=Operacao')).toBeVisible()
  37  |     await expect(page.locator('text=Clientes')).toBeVisible()
  38  |   })
  39  | 
  40  |   test('ETAPA 1 — Novo Lead: Cadastra cliente via formulário', async ({ page }) => {
  41  |     await page.goto(`${BASE_URL}/dashboard/clientes/novo`)
  42  | 
  43  |     // Preenche formulário
  44  |     await page.fill('input[name="nome"]', 'João da Silva Teste E2E')
  45  |     await page.fill('input[name="cpf"]', '529.982.247-25')
  46  |     await page.fill('input[name="telefone"]', '(11) 99999-9999')
  47  |     await page.fill('input[name="email"]', 'joao.teste@example.com')
  48  | 
  49  |     // Submete o formulário
  50  |     await page.click('button[type="submit"]')
  51  | 
  52  |     // Espera redirecionamento para página do cliente ou mensagem de sucesso
  53  |     await page.waitForTimeout(2000)
  54  | 
  55  |     // Verifica que não há mensagens de erro visíveis
  56  |     const errors = page.locator('[role="alert"]')
  57  |     const errorCount = await errors.count()
  58  |     if (errorCount > 0) {
  59  |       const errorText = await errors.first().textContent()
  60  |       console.warn('Erro encontrado:', errorText)
  61  |     }
  62  |   })
  63  | 
  64  |   test('ETAPA 2 — Visualiza cliente e acessa detalhes', async ({ page }) => {
  65  |     await page.goto(`${BASE_URL}/dashboard/clientes`)
  66  | 
  67  |     // Deve carregar a página de clientes
  68  |     await expect(page.locator('text=Clientes')).toBeVisible()
  69  | 
  70  |     // Aguarda o carregamento dos dados
  71  |     await page.waitForTimeout(2000)
  72  |   })
  73  | 
  74  |   test('ETAPA 3 — Acessa o pipeline/funil', async ({ page }) => {
  75  |     await page.goto(`${BASE_URL}/dashboard/funil`)
  76  | 
  77  |     // Verifica que a página carregou
  78  |     await expect(page.locator('text=Funil')).toBeVisible()
  79  |     // Aguarda carregamento do kanban
  80  |     await page.waitForTimeout(2000)
  81  |   })
  82  | 
  83  |   test('ETAPA 4 — Acessa financeiro', async ({ page }) => {
  84  |     await page.goto(`${BASE_URL}/dashboard/financeiro`)
  85  | 
  86  |     await expect(page.locator('text=Financeiro')).toBeVisible()
  87  |     await page.waitForTimeout(2000)
  88  |   })
  89  | 
  90  |   test('ETAPA 5 — Acessa documentos', async ({ page }) => {
  91  |     await page.goto(`${BASE_URL}/dashboard/documentos`)
  92  | 
  93  |     await expect(page.locator('text=Documentos')).toBeVisible()
  94  |     await page.waitForTimeout(2000)
  95  |   })
  96  | 
  97  |   test('ETAPA 6 — Acessa agenda/calendário', async ({ page }) => {
  98  |     await page.goto(`${BASE_URL}/dashboard/agenda`)
  99  | 
  100 |     await expect(page.locator('text=Agenda')).toBeVisible()
  101 |     await page.waitForTimeout(2000)
  102 |   })
  103 | 
  104 |   test('ETAPA 7 — Pós-Venda: Verifica módulo follow-up', async ({ page }) => {
  105 |     await page.goto(`${BASE_URL}/dashboard/followup`)
  106 | 
  107 |     await expect(page.locator('text=Follow-up')).toBeVisible()
  108 |     await page.waitForTimeout(2000)
  109 |   })
  110 | 
  111 |   test('Logout e verifica redirecionamento', async ({ page }) => {
  112 |     await page.goto(`${BASE_URL}/dashboard`)
  113 |     // Clica no botão de sair/logout
  114 |     const signoutBtn = page.locator('button:has-text("Sair")')
  115 |     if (await signoutBtn.count() > 0) {
  116 |       await signoutBtn.click()
  117 |       await page.waitForURL('**/login')
  118 |     }
  119 |   })
  120 | })
```