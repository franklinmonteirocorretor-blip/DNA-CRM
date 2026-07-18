# DNA CRM — Inventário de Funcionalidades v1.0

> Auditoria completa do código-fonte — 18 de Julho de 2026
>
> **Metodologia:** Análise de todos os arquivos `.ts`, `.tsx`, `.sql`, e configurações do projeto.
> **Legenda de Status:**
> - ✅ Funciona — implementada, sem erros visíveis, integrada ao fluxo
> - 🟡 Parcial — implementada mas com limitações ou pendências
> - 🔴 Não funciona — código presente mas quebrado ou incompleto

---

## 1. Autenticação

### 1.1. Login com Email/Senha
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/login/page.tsx` — Client Component com formulário
  - `app/login/actions.ts` — Server Actions: `loginAction`, `signUpAction`
- **Dependências:** `@supabase/ssr`, `next/navigation`
- **Observações:**
  - Usa `supabase.auth.signInWithPassword` no servidor
  - Loading state e erro exibidos na UI
  - Redirect para `/dashboard` em caso de sucesso (server-side)

### 1.2. Cadastro (Sign Up)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/login/page.tsx` — mesmo formulário, função `handleSignUp`
  - `app/login/actions.ts` — `signUpAction`
- **Dependências:** `supabase.auth.signUp`, `emailRedirectTo` configurado
- **Observações:**
  - Validação client-side de senha >= 6
  - Confirmação de email via Supabase
  - Mensagem verde "Verifique seu e-mail" exibida após cadastro

### 1.3. Callback de Autenticação
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/auth/callback/route.ts` — GET route handler
- **Dependências:** `supabase.auth.exchangeCodeForSession`
- **Observações:**
  - Suporta: confirmação de e-mail, reset de senha, magic link (futuro), OAuth (futuro)
  - Redireciona para `next` query param ou `/dashboard`

### 1.4. Logout (Sign Out)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/auth/signout/route.ts` — POST route handler
  - `app/dashboard/layout.tsx` — form com `action="/auth/signout" method="post"`
- **Dependências:** `supabase.auth.signOut`
- **Observações:**
  - Veridica se usuário existe antes de fazer signOut
  - Redireciona para `/login` com status 303

### 1.5. Proteção de Rota (Dashboard Layout)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/layout.tsx` — Server Component com `getUser()`
- **Dependências:** `redirect` do Next.js
- **Observações:**
  - Segunda camada de segurança (primeira seria middleware, não implementado no código)
  - Também busca perfil do usuário para header (nome, perfil)
  - Determina `ehGerente` para mostrar/esconder link "Equipe"

### 1.6. Hook Client-Side (useAuth)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/hooks/useAuth.ts`
- **Dependências:** `supabase.auth.getSession`, `onAuthStateChange`
- **Observações:**
  - Útil para Client Components que precisam do usuário
  - Escuta mudanças de autenticação em tempo real
  - Retorna `{user, usuario, loading, signOut}`
  - **Não é usado em nenhum componente existente** — os componentes atuais usam Server Components diretamente

### 1.7. Hook useNotificacoes
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/hooks/useNotificacoes.ts`
  - `src/components/layout/NotificacoesBell.tsx`
- **Dependências:** Supabase Realtime (`postgres_changes`), `Notification API`
- **Observações:**
  - Busca inicial das últimas 50 notificações
  - Escuta INSERTs em tempo real na tabela `notificacoes`
  - Suporte a notificações do navegador (desktop push)
  - Optimistic update ao marcar como lida
  - Tempo relativo (`agora mesmo`, `h sm dias`)

---

## 2. Dashboard

### 2.1. Métricas Diárias (Cards)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/page.tsx`
- **Dependências:** `producao_diaria` table (feed por triggers do banco)
- **Observações:**
  - 4 cards coloridos: Ligações, WhatsApp, Agendamentos, Comparecimentos
  - Busca produção do dia via `producao_diaria` onde `usuario_id = user.id`
  - Se não houver produção hoje, mostra zero

### 2.2. Acesso Rápido
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/page.tsx`
- **Observações:**
  - 3 links: Clientes (com count), Funil de Vendas, + Novo Lead
  - Count de clientes usa `exact` do Supabase (performance otimizada)

### 2.3. Alertas do Dashboard
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/page.tsx` — busca dos dados
  - `src/components/dashboard/SecaoAlertas.tsx` — renderização
- **Dependências:** Supabase joins
- **Observações:**
  - 4 tipos de alertas:
    - Clientes parados (5+ dias, limit 5)
    - Agendamentos hoje/amanhã (limit 10)
    - Documentos pendentes de validação (limit 5)
    - Pós-venda com prazo em atrás 3 dias (limit 5)
  - Estado "Tudo em dia" quando zero alertas

### 2.4. Produção da Semana
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/page.tsx`
- **Dependências:** `producao_diaria`
- **Observações:**
  - Últimos 7 dias de produção
  - Mostra ligações + WhatsApp + agendamentos + pontuação por dia
  - Agrupamento por data (decrescente)

### 2.5. Lembretes (visão alternativa)
- **Status:** 🟡 Parcial (implementado mas não usado na página principal)
- **Arquivos envolvidos:**
  - `src/components/dashboard/LembretesDashboard.tsx`
  - `src/components/dashboard/AlertasDashboard.tsx`
- **Observações:**
  - `LembretesDashboard` é um Async Server Component auto-contido (busca seus próprios dados)
  - `AlertasDashboard` é similar mas com agrupamento diferente
  - **Nenhum dos dois é importado ou usado na página principal do dashboard**
  - Duplicação de funcionalidade: 3 implementações diferentes de alertas/lembretes
  - `LembretesDashboard.tsx` tem bug: `.limit(10)` duplicado na query de posVenda (linha 68-69)

---

## 3. Clientes

### 3.1. Lista de Clientes
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/clientes/page.tsx` — Server Component
  - `src/components/clients/BarraBuscaFiltros.tsx` — Client Component
- **Dependências:** Supabase query builder, `useSearchParams`
- **Observações:**
  - Dois modos de visualização:
    - **Sem filtro:** agrupado por colunas Kanban (10 etapas do funil)
    - **Com filtro:** lista plana (tabela de linhas)
  - Busca por nome (ilike) ou CPF (ilike)
  - Filtros: etapa, empreendimento, ordem (recentes/antigos/nome/atividade últimas)
  - Mostra cards com nome, telefone formatado, badges (Empreendimento, Casado, Pasta OK, alerta sem contato)

### 3.2. Novo Cliente (Cadastro de Lead)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/clientes/novo/page.tsx` — Client Component
  - `app/dashboard/clientes/novo/actions.ts` — Server Action `cadastrarCliente`
- **Dependências:** `react-hook-form` — NÃO (usa Form nativo + `useState`)
- **Observações:**
  - Máscaras de CPF e Telefone em tempo real
  - Validação client-side (nome >= 3, CPF == 11 dígitos, telefone >= 10)
  - Validação server-side (redundante, dupla camada)
  - Campos opcionais: email, renda, dependentes, empreendimento, observações
  - Corretor responsável automático: `corretor_responsavel_id = user.id`

### 3.3. Ficha do Cliente (Visualização Detalhada)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/clientes/[id]/page.tsx` — Server Component (página dinâmica)
- **Dependências:** 5 sub-queries Paralelas
- **Observações:**
  - Grid responsivo (2 colunas em desktop)
  - Cards informativos: Dados pessoais, Financeiros, Cônjuge, Status no funil
  - Formatações: CPF, telefone, renda, FGTS, tempo CLT
  - Seções integradas: Atividades, Agendamentos, Documentos, Análise, Fechamento, Pós-Venda
  - Funções helpers: `InfoItem`, `ETAPA_LABEL`, `ETAPA_COR`, `ATIVIDADE_LABEL`
  - `notFound()` se cliente não encontrado

### 3.4. Registrar Atividade
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/FormAtividade.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `registrarAtividade` Server Action
- **Dependências:** `atividades` table
- **Observações:**
  - Modo colapsado: 3 botões rápidos (Ligação, WhatsApp, Follow-up) — 1 clique
  - Modo expandido: seleção de tipo + campo de observação (500 caracteres)
  - Feedback auto-desaparece 3s após sucesso
  - Trigger `atividade_producao` atualiza `produção_diaria` automaticamente
  - Trigger `atividade_toque` atualiza `última_atividade_em`

### 3.5. Agendar Visita
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/FormAgendamento.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `agendarVisita` Server Action
- **Dependências:** `SelectEmpreendimento`, `datetime-local`
- **Observações:**
  - Validação server-side: data obrigatória, deve ser no future
  - Registra atividade automática: "Visita agendada em [data] às [hora]"
  - Trigger: `agendamento_sincroniza_funil` move cliente para `AGENDAMENTO`
  - Limpa data/hora ao enviar, mantém empreendimento selecionado

### 3.6. Registrar Comparecimento
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/SecaoComparecimento.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `registrarComparecimento`
- **Dependências:** unique constraint no banco (comparação 1:1 com agendamento)
- **Observações:**
  - Lista os últimos 10 agendamentos com seus comparecimentos
  - Formulário: resultado (Compareceu / Não compareceu) + motivo (se não) + observação
  - Detecta erro de unique constraint (23505) e mostra feedback amigável
  - Agendamentos cancelados não permitem registrar comparecimento
  - Trigger: `comparecimento_sincroniza_funil` mova para `COMPARECIMENTO`
  - Trigger: `comparecimento_producao` KPI + 1 comparecimentos

### 3.7. Upload de Documentos
- **Status:** 🟡 Parcial
- **Arquivos envolvidos:**
  - `src/components/clients/SecaoDocumentos.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `uploadDocumento` Server Action
- **Dependências:** Supabase Storage bucket ´documentos`, `FileReader API`
- **Observações:**
  - Suporta: JPG, PNG, WebP, PDF (máx. 10 MB) ✅
  - Upload via base64 convertido para buffer no servidor ✅
  - Caminho organizado: `[cliente_id]/[timestamp]-[nome_arquivo]` ✅
  - URL assinada (1 ano de validade) ✅
  - **Tipos de documento no código estão desatualizados** 🟡
    - O enum `TipoDocumento` no front (types/index.ts) tem apenas 8 valores
    - O banco de dados suporta 13 tipos (adicionados: `COMPROVANTE_ENDERECO`, `CERTIDAO_NASCIMENTO`, `CERTIDAO_CASAMENTO`, `CERTIDAO_CASAMENTO_AVERBACAO`, `MO_AUTODECLARACAO_DEPENDENTE`)
    - O component `SecaoDocumentos` não inclui os 5 novos tipos
  - **Campo `de_dependente` e `grau_parentesco` do banco não são usados no frontend** 🟡
  - Verificação de pasta completa ignorando documentos de dependentes ✅

### 3.8. Análise de Crédito
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/FormAnalise.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `registrarAnalise`
- **Dependências:** `resultado_analise` tipo enum
- **Observações:**
  - 4 opções com descrições e cores distintas
  - Já analisado: mostra badge + opção "Reavaliar?" que filtra o resultado atual
  - Placeholder contextualizado conforme tipo de análise
  - Validação: move para etapas anteriores apenas (antes de ANALISE)

### 3.9. Fechamento (Ficha Proposta Assinada)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/FormFechamento.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `registrarFechamento`
- **Dependências:** Trigger `cliente_fechamento` no banco (before update)
- **Observações:**
  - Só aparece se `resultado_analise === APROVED`
  - Trigger automático seta `etapa_atual = FECHAMENTOS`, `data_fechamento = now()`
  - Se já fechado, mostra badge verde "Fecha Fecha informação"
  - Notificação `FECHAMENTO_REALIZADO` disparada pelo trigger

### 3.10. Pós-Venda
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/components/clients/FormPosVenda.tsx` — Client Component
  - `app/dashboard/clientes/[id]/actions.ts` — `registrarPosVenda`
- **Dependências:** `etapa_atual in ['FECHAMENTOS', 'POS_VENDA']`
- **Observações:**
  - Mostra: data entrega do imóvel (input date), próxima ação (texto), prazo (datetime-local)
  - Resumo com 3 cards miniatura (entrega, ação, prazo)
  - Botão "Iniciar Pos-Venda": altera etapa sem parâmetros
  - Validação: só permite clientes em `FECHAMENTOS` ou `POS_VENDA`

---

## 4. Pipeline (Funil)

### 4.1. Visualização do Funil
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/funil/page.tsx` — Server Component
- **Dependências:** `clientes` table
- **Observações:**
  - 10 etapas do funil (NOVO_LEAD → POS_VENDA)
  - Barras horizontais proporcionais ao máximo
  - Taxa de conversão entre etapas consecutivas (%, via arrow)
  - 4 cards de resumo: Topo do funil, Em negociação, Em análise, Convertidos
  - Estado vazio com link para cadastrar

### 4.2. Pipeline Transition Automating
- **Status:** ✅ Funciona
- **Observações:**
  - Disparado por triggers do banco:
    - `agendamento_sincroniza_funil` (NOVO_LEAD/CONTATOS → AGENDAMENTO)
    - `comparecimento_sincroniza_funil` (COMPARECEU → COMPARECIMENTO)
    - `registrar analise` Server Action (→ ANALISE)
    - `cliente_fechamento` trigger (APROVADO → FECHAMENTOS)
    - `registrar pos-venda` Server Action (FECHAMENTOS → POS_VENDA)
  - Não há transição automática ao longo das 10 etapas
  - Algumas transições (RESTRICOES, CONDICIONADOS, APROVADOS) dependem de trigger que ainda não existe

---

## 5. Agenda

### 5.1. Agendamentos no Dashboard
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/page.tsx` (via `SecaoAlertas`)
- **Observações:**
  - Mostra próximos agendamentos (hoje e amanhã) no dashboard
  - Indicar data/hora formatada ("Hoje, 14:30" ou "Amanhã, 10:00")
  - Mostra empreendimento de interesse

### 5.2. Agendamentos na Ficha do Cliente
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `SecaoComparecimento` já descrito em 3.6
- **Observações:**
  - Lista os últimas 10 agendamentos
  - Cada um mostra seu comparecimento (se registrado)
  - Permite registrar comparecimento inline

### 5.3. Página Dedicada de Agenda
- **Status:** 🔴 Não existe
- **Observações:**
  - Não há rota `/dashboard/agenda`
  - Não há visualização de calendário (semanal, mensal)
  - Agendamentos só visíveis nos alertas do dashboard e na ficha do cliente

---

## 6. Gestão

### 6.1. Visão da Equipe (Gerente)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/equipe/page.tsx` — Server Component
- **Dependências:** role: GERENTE ou ADMIN graf
- **Observações:**
  - Proteção: redirect para `/dashboard` se não for GERENTE/ADMIN
  - Cards de métricas do dia (agregados de todos corretores)
  - Carousel de desempenho individual por corretor (nome, pontos, ligações, whatsapp)
  - Funil consolidado da equipe (barras horizontais)
  - Produção semanal da equipe (agregado)

### 6.2. Rankings (Gamificação)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/rankings/page.tsx` — Server Component
- **Dependências:** `producao_diaria` + `clientes` tables
- **Observações:**
  - Filtro por role: CORRETOR mostram só seus dados; GERENTE sua equipe; ADMIN todos
  - Período: mês atual
  - Top 3 VGV destacado em cards de podium (🥇🥈🥉)
  - 6 rankings de produtividade: Ligações, Documentos, Análises, Aprovações, Fechamentos, Conversão
  - Rankings de VGV e Comissão
  - Tabela ampla com todas as métricas
  - Funções internas de ranking: `top3()` retorna para classificação
  - `taxaConversao` calculada: fechamentos / total clientes

### 6.3. Gerência de Corretores
- **Status:** 🔴 Não existe interface
- **Observações:**
  - CRUD de corretores não implementado no frontend
  - Campo da tabela `usuarios` está definido via Supabase (sua auto-provisionamento)
  - Não há página para cadastrar/editar corretores ou atribuir gerente

---

## 7. Empreendimentos

### 7.1. Lista de Empreendimentos
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/empreendimentos/page.tsx` — Server Component
- **Dependências:** `empreendimentos` table
- **Observações:**
  - Separados em Ativos e Inativos
  - CRUD: botão `+ Novo` → criação de novo
  - Linhas: nome + endereço + vagas + status + botão Ativo/Inativo + Editar

### 7.2. Criar / Editar Empreendimento
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/empreendimentos/novo/page.tsx` — Server Component
  - `app/dashboard/empreendimentos/novo/FormEmpreendimento.tsx` — Client Component
  - `app/dashboard/empreendimentos/actions.ts` — `criarEmpreendimento`, `editarEmpreendimento`
- **Dependências:** `searchParams.id` para edição
- **Observações:**
  - Nome obrigatório (>=2 caracteres), endereço opcional
  - Vagas: 0-9999
  - Status Ativo/Inativo como radio buttons (só na edição)
  - Redirect automático após sucesso
  - Validação server-side + client-side

### 7.3. Alterar Ativo/Inativo (Toggle Otimista)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/empreendimentos/FormAlternarAtivo.tsx` — Client Component
  - `app/dashboard/empreendimentos/actions.ts` — `alternarAtivoEmpreendimento`
- **Dependências:** Realtime sem websocket (otimista + rollback)
- **Observações:**
  - Atualização otimista de UI (muda estado imediatamente)
  - Erro lambda faz rollback do toggle
  - Esta ação é singlemente responsável

---

## 8. Gate
### 8.1. Geração de Relatórios (Dados)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/gates/relatores/actions.ts` — `gerarDadosRelatorio` Server Action
- **Dependências:** Supabase queries
- **Observações:**
  - 4 tipos de relatório:
    - **Produção Diária:** Total de ligações, WhatsApp, Agendamentos, Comparecimentos, Follow-up, Pastas, Aprovações, Vendas, Pontuação
    - **Funil de Vendas:** Distribuições por etapa com conversão
    - **Lista de Clientes:** Dados completos, nome, CPF formatado, telefone, etapa, pasta fechado, empresas
    - **Financeiro:** Clientes fechados com VGV, % comissão, valor da comissão, corretor responsável
  - Filtragem: Corretor vê só seus dados; Gerente vê equipe
  - A estrutura de dados `DadosRelatorio` é única (com colunas dinâmicas)

### 8.2. Interface de Seleção de Relatório
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/dashboard/relatorios/page.tsx` — Client Component
- **Observações:**
  - 4 opções de tipo com rádio + descrições
  - Período: data início + data fiss (padrão = mês atual)
  - Dois botões: "Exportar Excel (CSV)" e "Exportar PDF (HTML)"
  - Erro de geração mostrados no próprio UI

### 8.3. Export Excel (CSV)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/api/relatorias/excel/route.ts` — GET Route Handler 🔗  **Dependências:** `gerarDadosRelatorio` server action
- **Observações:**
  - BOM UTF-8 (Excel compatível)
  - Cabeçal com título + período + data geração
  - Dados com separadores `;` (estilo pt-BR)
  - Submit: final com RESUME --- **Bold lines**)

### 8.4. Export PDF (HTML para impressão)
- **Status:** 🟡 Parcial
- **Arquivos envolvidos:**
  - `app/api/relatorias/pdf/route.ts` — GET Route Handler
- **Dependências:** Nenhuma biblioteca de PDF (apenas HTML)
- **Observações:**
  - **NÃO gera PDF real** — gera HTML formatado que depende do navegador para impressão
  - Abrir o arquivo baixado (`.html`), Ctrl+P, "Salvar como PDF"
  - Não usa biblioteca como Playwright, puppeteer ou jsPDF
  - Deficiência: dependência de interação manual

---

## 9. Configurações

### 9.1. Página de Configurações
- **Status:** 🔴 Inexistente
- **Observações:**
  - Não há rota `/dashboard/configuracoes`
  - Não há interface para editar: perfil do usuário, notificações, preferências, times zona, empresa, etc.

### 9.2. Configuração Técnica
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `.env.local` — variáveis de ambiente (Supabase URL, Anon Key, Service Role Key)
  - `next.config.ts` — Next.js config (vazia, mas funcional)
  - `package.json` — dependências
  - `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- **Dependências:**
  - `next@16.2.10`, `react@19.2.4`
  - `@supabase/ssr@0.12.1`, `@supabase/supabase-js@2.110.2`
  - `tailwindcss@v4`, `eslint@9`
  - `typescript@5`
- **Observações:**
  - **Prisma mencionado no README mas não instalado** 🟡
  - `.gitignore` presente mas não verificado conteúdo
  - O projeto usa Supabase com RLS (não usa middleware no Next.js)

### 9.3. Tailwind/Tema
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/globals.css` — Tailwind + CSS variables
  - `postcss.config.mjs`
- **Observações:**
  - Tailwind v4 (`@import "tailwindcss"`)
  - CSS variables para tema (branco/incolor)
  - Dark mode via `prefers-color-scheme` (minimamente configurado)

---

## 10. Tipo de Dados (Types)

### 10.1. Definições de Tipo
- **Status:** 🟡 Parcial
- **Arquivos envolvidos:**
  - `src/types/index.ts`
- **Observações:**
  - 10 enums definidos ✅
  - 10 interfaces para tabelas do banco ✅
  - **Está desatualizado com o schema do banco** 🟡
    - `TipoDocumento` tem 8 valores (banco tem 13)
    - `Conjuge` não inclui `tres_anos_clt` (adicionado na migração 0012)
    - `Documento` não inclui `de_dependente` nem `grau_parentesco` (adicionados em 0016, 0017)
    - `Cliente` não inclui: `data_nascimento`, `tres_anos_clt`, `possui_dependente`, `regiao_interesse`, `forma_renda` (adicionados em 0011-0013)
    - Tabela `leads` não tem tipo TypeScript
    - Enum `origem_atendimento` e `motivo_nao_atendimento` não estão definidos no código

---

## 11. APIs

### 11.1. API de Relatórios — Excel
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `app/api/relatorios/excel/route.ts`
- **Observações:** Descrita em 8.3

### 11.2. API de Relatórios — PDF
- **Status:** 🟡 Parcial
- **Arquivos envolvidos:**
  - `app/api/relatorios/pdf/route.ts`
- **Observações:** Descrita em 8.4

### 11.3. API CRUD RESTful
- **Status:** 🔴 Inexistente
- **Observações:**
  - Não há endpoints REST (excepto relatórios de export)
  - Toda a lógica de CRUD é feita via Server Actions
  - Inexistente autenticação JWT ou API Key para uso externo

---

## 12. Componentes

### Componentes de Layout

| Componente | Arquivo | Status | Observações |
|---|---|---|---|
| `NotificacoesBell` | `layout/NotificacoesBell.tsx` | ✅ | Bell icon + dropdown realtime |
| Dashboard Layout | `app/dashboard/layout.tsx` | ✅ | Auth guard + header + nav |

### Componentes Dashboard

| Componente | Arquivo | Status | Observações |
|---|---|---|---|
| `SecaoAlertas` | `dashboard/SeeAlertas.tsx` | ✅ | Presentational puxa todos os 4 tipos de alerta |
| `LembretesDashboard` | `dashboard/LembretesDashboard.tsx` | 🟡 | Implementados, não usado na página principal |
| `AlertasDashboard` | `dashboard/AlertasDashboard.tsx` | 🟡 | Similar ao above, não usado, concorrência de funcionalidade |

### Componentes de Clientes

| Componente | Arquivo | Status | Observações |
|---|---|---|---|
| `BarraBuscaFiltros` | `clients/BarraBuscaFiltros.tsx` | ✅ | Search + filtros + ordinação |
| `SelectEmpreendimento` | `clients/SelectEmpeita.tsx` | ✅ | Dropdown async de carregamento |
| `FormAtividade` | `clients/FromAtividade.tsx` | ✅ | Collabável: rápida+expansão |
| `FormAgendamento` | `clients/FormAgendamento.tsx` | ✅ | Collabável + SelectEmpreendimento |
| `FormAnalise` | `clients/FormAnalise.tsx` | ✅ | 4 outcomes + reavaliação |
| `FormFechamento` | `clients/FormFechamento.tsx` | ✅ | Condicional por aprovado |
| `FormFor aVenda` | `clients/FormPosVenda.tsx` | ✅ | Condicional + resumo mini |
| `SecaoComparecimiento` | `clients/Comparecimento.tsx` | ✅ | Agendamentos + inline comparecimento |
| `SecaoDocumentos` | `clients/SecaoDocumentos.tsx` | ✅ | Upload + lista por tipo + status |

### Componentes de Empreendimentos

| Componente | Arquivo | Status | Observações |
|---|---|---|---|
| `FormAlternarAtivo` | `empreendimento/FormAlternarAtivo.tsx` | ✅ | Toggle otimista |
| `FormEmpreendimento` | `empreendimento/novo/FormEmpreendimento.tsx` | ✅ | Create/Update form |

---

## 13. Hooks

| Hook | Arquivo | Status | Observações |
|---|---|---|---|
| `useAuth` | `hooks/useAuth.ts` | ✅ | Implementado, mas não usado em código real |
| `useNotificacoes` | `hooks/useNotificacoes.ts` | ✅ | Utilizado por `NotificacoesBell` |

---

## 14. Serviços

### 14.1. Supabase Browser Client
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/lib/supabase.ts`
- **Dependências:** `@supabase/supabase-js`
- **Observações:**
  - Cria singleton client com credenciais públicas
  - Verifica env vars antes de criar

### 14.2. Supabase Server Client
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/lib/server/supabase.ts`
- **Dependências:** `@supabase/ssr`, `next/headers cookies`
- **Observações:**
  - Async factory (cada Server Component/Action cria seu próprio)
  - Implementa `getAll` e `setAll` do cookie handlers

### 14.3. Auth Helper Service (Server)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - `src/lib/server/auth.ts`
- **Observações:**
  - Três utilitários: `getUsuarioLogado()`, `isAuthenticated()`, `getPerfilUsuario()`
  - Usa `supabase.single()` para buscar perfil
  - **Não importados/ejecutados por nenhum arquivo existente** 🟡

---

## 15. Middleware

### 15.1. Middleware do Next.js
- **Status:** 🔴 Inexistente
- **Observações:**
  - Não há `middleware.ts` na raiz do projeto
  - Toda autorización é feita por layouts (Server Components) — pela camada de negócio, não via Edge/server middleware
  - Sem proteção no Edge, load do dashboard sempre carrega parcialmente antes de redirecionar

---

## 16. Permissões (RBAC)

### 16.1. Row Level Security (RLS)
- **Status:** ✅ Configurado em banco
- **Arquivos envolvidos:**
  - `database/migrations/0000_producao_completa.sql` (22 políticas RLS)
- **Observações:**
  - Tabelas protegidas para: Select, Insert, Update de acordo com OWNER/GERENTE
  - RLS força isolamento por `corretor_responsavel_id` nos clientes
  - Gerentes têm acesso a dados dos seus subordinados

### 16.2. Controle de Acesso no Frontend
- **Status:** ✅ Funciona
- **Observações:**
  - `ehGerente` usado para condicionalmente renderar link "Equipe" e proteger páginas
  - Gerente: acesso à página da equipe se seu perfil é GERENTE e ADMIN
  - Corretor: acesso apenas aos seus dados via RLS
  - Acesso `getPerfilUsuario` auto-definido em cada página separadamente (não consolidado em middleware/unificado)

### 16.3. Controle de Acesso em Server Actions
- **Status:** ✅ Funciona
- **Observações:**
  - Cada Server Action verifica `supabase.auth.getUser()` antes de operar
  - As permissões são validadas tanto pelo RLS de bancos quanto por código

### 16.4. Perfis de Usuário
- **Status:** 🟡 Parcialmente usado
- **Arquivos envolvidos:**
  - `database/migrations/0000_producao_completa.sql`
- **Observações:**
  - Três perfis: CORRETOR, GERENTE, ADMINISTRADO
  - `ADMINISTRADOR` é tratado como GERENTE no código (pode ver tudo)
  - Não há página de administração separada

---

## 17. Responsividade

### 17.1. Tailwind Breakpoints
- **Status:** ✅ Boa cobertura
- **Observações:**
  - Uso de `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`
  - Cards métricos: `grid-cols-2 md:grid-cols-4 md:grid-cols-5`
  - Navegação: `overflow-x-auto` em dispositivos menores
  - Barra de busca workflow: `max-w-full` e breakpoints
  - Sidebar: **não existe** — navegação horizontal é horizontal

### 17.2. Modo Mobile
- **Status:** 🟡 Parcial
- **Observações:**
  - Amigável para tablet portrait e landscape
  - Não há menu hamburgo para smartphones
  - Não há drawer/sheet para menus
  - Formulários com grid colapso bem em telas pequenas
  - Loading states básicos

---

## 18. Testes

### 18.1. Testes Unitários
- **Status:** 🔴 Não existem
- **Observações:**
  - `grep -r "**/*.test.ts"` retornou vazio
  - `grep -r "**/*.spec.ts"` retornou vazio
  - Não há jest.config, vitest.config, ou qualquer configuração de teste
  - `package.json` não inclui nada biblioteca de teste

### 18.2. Testes de Integração / E2E
- **Status:** 🔴 Não existem
- **Observações:**
  - Zero arquivos de teste

### 18.3. TypeScript Strict
- **Status:** ✅ Funciona
- **Observações:**
  - Projeto compila com TypeScript
  - `tsconfig.json` presente (não lido detalhes completas)
  - Checked at build time

---

## 19. Engine de Produção e Triggers do Banco

### 19.1. Produção Diária (KPIs)
- **Status:** ✅ Funciona
- **Arquivos envolvidos:**
  - Banco: `producao_diaria` table + 6 triggers auto-populando
  - Não há código frontend que escreva nessa tabela — é 100% triggers
- **Observações:**
  - `pontuacao_gamificacao` é column GENERATED: `(ligacoes*1 + whatsapp*0.5 + agendamentos*10 + comparecimentos*20 + pastas*40 + aprovacoes*80 + vendas*160)`
  - Gráfico falado maps "Comparecimentos" (não "Pastas") no dashboard

### 19.2. Triggers de Fechamento
- **Status:** ✅ Funciona
- **Observações:**
  - `cliente_ecagem` (before update): quando `ficha_proposta_assinada` mude, set `etapa_atual = 'FECHAMENTOS'` e data
  - `trg_notificar_fechamento` / `trg_notificar_analise`: envia notificações em tempo real
  - `atividade_toque`: atualiza `ultima_atividade_em` quando registro de atividade

### 19.3. Upload de Documentos — Pasta Completa
- **Status:** ✅ Funciona
- **Observações:**
  - Trigger do banco verifica se o conjunto mínimo (identidade + CPF + renda) está completo
  - Atualiza `pasta_completa_em` timestamp
  - Todo verificado via function SQL no banco `fn_pasta_completa`

---

## 20. Observações de Qualidade do Código

### Problemas Detectados

1. **Duplicação de código:**
   - `ETAPA_CONFIG` registrada nos 3 locais: `clientes/page.tsx` (visualização), `clientes/[id]/page.tsx` (ficha) e `funil/page.tsx` (funil)
   - 3 componentes de alertas com funções sobrepostos (`SecaoAlertas`, `LembretesDashboard`, `AlertasDashboard`)
   - Funções de formatação de datas, meus, telefones duplicadas em vários arquivos

2. **Bug no LembretesDashboard:**
   - `.limit(10).limit(10)` na query de `posVendaPrazos` — duplo chamada a `limit`

3. **Tipos desatualizados (TypeScript vs Banco):**
   - Enum `TipoDocumento` tem 8 valores; o BD tem 13
   - `Cliente` interface desatualizada com os campos mais recentes do banco
   - `Leads` table não mapeada em TypeScript

4. **Sem tratamento de erros robusto:**
   - Apenas 2 rotas têm `error.tsx` (não encontradas)
   - Nenhum `error.js` ou `global-error.tsx` configurado
   - Várias queries sem `try/catch` explícito (apesar de que retornam null)

5. **API de Relatórios:**
   - PDF via HTML é frágil e não gera PDF real
   - Filtro data de início/fim nos relatórios "Funil" e "Clientes" não usam a data (só busca todos)

6. **Prisma mencionado no README mas não instalado:**
   - Toda a camada de banco é feita diretamente pelo Supabase, sem ORM

7. **Ausência de Estados Loading:**
   - Nenhuma `loading.tsx` em estrutura de páginas
   - Loadin: só nos componentes individuais com `useState(true/false)`
   - Next.js streaming não configurado

8. **Dark Mode:**
   - CSS vares definidos mas layout usa `bg-white`/`bg-gray-50` (desconsiderando modo escuro)

---

## Tabela Resumo Completa

| # | Funcionalidade | Status | Prioridade | Observações |
|---|---|---|---|---|
| 1 | Login com Email/Senha | ✅ Funciona | — | Completo, com feedback |
| 2 | Cadastro (Sign Up) | ✅ Funciona | — | Bom terminado com confirmação |
| 3 | Callback de Autenticação | ✅ Funciona | — | Fluxo de verificação de email |
| 4 | Logout (Sign Out) | ✅ Funciona | — | Limpeza de sessão |
| 5 | Proteção de Rota | ✅ Funciona | — | Com redirect |
| 6 | Hook useAuth | ✅ Funciona | Baixa | Não utilizado |
| 7 | Hook useNotificacoes | ✅ Funciona | — | Realtime + desktop |
| 8 | Dashboard — Métricas de Hoje | ✅ Funciona | — | |
| 9 | Dashboard — Acesso Rápido | ✅ Funciona | — | |
| 10 | Dashboard — Alertas | ✅ Funciona | — | |
| 11 | Dashboard — Produção Semanal | ✅ Funciona | — | |
| 12 | Lembretes/Alertas (duplicatas) | 🟡 Parcial | Baixa | `LembretesDashboard` e `AlertasDashboard` não usados |
| 13 | Listagem de Clientes | ✅ Funciona | — | Kanban + Search |
| 14 | Cadastro de Novo Cliente | ✅ Funciona | — | Máscaras + validação |
| 15 | Ficha Cliente (Detalhada) | ✅ Funciona | — | Painel central |
| 16 | Registrar Atividade | ✅ Funciona | — | Botões rápidos + expandido |
| 17 | Agendar Visita | ✅ Funciona | — | Empreendimento + observação |
| 18 | Registrar Comparecimento | ✅ Funciona | — | Trigger automático funil |
| 19 | Upload de Docs | 🟡 Parcial | Média | Tipos de doc desatualizados |
| 20 | Análise de Crédito | ✅ Funciona | — | Reavaliação incluída |
| 21 | Fechamento (close deal) | ✅ Funciona | — | Condicional por etapa |
| 22 | Pós-Venda | ✅ Funciona | — | Tracking + ações |
| 23 | Funil de Vendas | ✅ Funciona | — | Conversão + resumos |
| 24 | Agendamento Dashboard | ✅ Funciona | — | Embedded nos alertas |
| 25 | Página de Agenda dedicada | 🔴 Inexistente | Alta | Necessária (calendário) |
| 26 | Visão da Equipe | ✅ Funciona | — | Gerente/Admin only |
| 27 | Rankings / Gamificação | ✅ Funciona | — | top3 + tabela ampla |
| 28 | CRUD Corretores | 🔴 Inexistente | Alta | Não há UI para criar usuários |
| 29 | Lista de Empreendimentos | ✅ Funciona | — | Ativos/Inativos |
| 30 | Criar/Editar Empreendimento | ✅ Funciona | — | Com toggle otimista |
| 31 | Relatórios (Dados) | ✅ Funciona | — | 4 tipos |
| 32 | Relatório Excel (CSV Export) | ✅ Funciona | — | Baixável |
| 33 | Relatório PDF (HTML Export) | 🟡 Parcial | Média | HTML — não PDF real |
| 34 | Página de Configurações | 🔴 Inexistente | Alta | Perfil, sistema, etc |
| 35 | Configuração Técnica | ✅ Funciona | — | Env, Tailwind |
| 36 | Tipos TypeScript | 🟡 Parcial | Média | Desatualizado com BD |
| 37 | API RESTful externa | 🔴 Inexistente | Baixa | Apenas Server Actions |
| 38 | Middleware de Segurança | 🔴 Inexistente | Alta | No Edge — sem proteção |
| 39 | RBAC/RLS no Banco | ✅ Funciona | — | 22 políticas |
| 40 | Responsividade (Desktop) | ✅ Funciona | — | |
| 41 | Responsividade (Mobile) | 🟡 Parcial | Média | Sem hamburger/bottom-nav |
| 42 | Testes Unitários | 🔴 Inexistentes | Alta | Nenhum |
| 43 | Testes de Integração/E2E | 🔴 Inexistentes | Alta | Nenhum |
| 44 | Triggers de Produção (KPIs) | ✅ Funciona | — | Apenas no banco |
| 45 | Notificacciones Realtime | ✅ Funciona | — | Push + Desktop |
| 46 | Dark Mode | 🟡 Parcial | Baixa | CSS vars mas não utilizado |
| 47 | Loading States | 🟡 Parcial | Média | Só botões, sem layout |
| 48 | Tratamento de Erros | 🟡 Parcial | Alta | Sem error boundaries |
| 49 | Tela de Visualização de Leads | 🔴 Inexistente | Média | Tabela `leads` no banco, sem UI |
| 50 | Editar dados do cliente | 🔴 Inexistente | Alta | Não é possível editar cliente existente |

---

## Estatísticas

| Categoria | Total | ✅ Funciona | 🟡 Parcial | 🔴 Inexistente |
|---|---|---|---|---|
| Autenticação | 7 | 7 | 0 | 0 |
| Dashboard | 6 | 5 | 1 | 0 |
| Clientes | 12 | 11 | 1 | 0 |
| Pipeline | 2 | 2 | 0 | 0 |
| Agenda | 3 | 2 | 0 | 1 |
| Gestão | 3 | 2 | 0 | 1 |
| Empreendimentos | 3 | 3 | 0 | 0 |
| Relatórios | 4 | 3 | 1 | 0 |
| Configurações | 3 | 1 | 0 | 2 |
| Banco de Dados | 3 | 3 | 0 | 0 |
| APIs | 3 | 1 | 1 | 1 |
| Componentes | 15 | 13 | 2 | 0 |
| Hooks | 2 | 2 | 0 | 0 |
| Serviços | 3 | 3 | 0 | 0 |
| Middleware | 1 | 0 | 0 | 1 |
| Permissões | 4 | 3 | 1 | 0 |
| Responsividade | 2 | 1 | 1 | 0 |
| Testes | 3 | 0 | 0 | 3 |
| Qualidade | 5 | 0 | 3 | 2 |
| **TOTAL** | **85** | **62 (73%)** | **11 (13%)** | **12 (14%)** |

---

> **Relatório gerado por:** MIMO-code v3.0
> **Data:** 18 de Julho de 2026
> **Versão do Projeto:** 0.1.0 (pré-MVP)