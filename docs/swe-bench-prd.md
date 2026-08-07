# SWE-Bench Dashboard — PRD (Product Requirements Document)

## Visão Geral
Dashboard web para visualização e comparação de resultados de avaliação de modelos em SWE-Bench (Software Engineering Benchmark). O produto serve como um leaderboard interativo para ML engineers e pesquisadores.

---

## 1. Escopo

### In Scope
- Painel leaderboard rankeado por resolved rate
- Multi-filtro: benchmark, modelo, métrica
- Pesquisa textual rápida de modelos
- Paginação configurável (20/50/100)
- KPI cards de resumo
- Modo escuro e claro
- Responsivo: desktop + mobile
- Acessível: WCAG AA

### Out of Scope (v1)
- Página de detalhes individuais de modelo
- Exportação CSV/PDF
- Autenticação (app público)
- Comparação lado a lado
- Gráficos de tendência temporal
- Submissão de novos resultados
- Benchmark customizado pelo usuário

---

## 2. Requisitos Funcionais

### RQ-01: Leaderboard
- Tabela ordenável (default: resolved_rate DESC)
- Colunas: Rank, Model, Resolved Rate, Avg Runtime, # Tasks, Benchmark
- Ícone de ordenação (asc/desc)
- Highlight na linha ao hover

### RQ-02: Filtros
- **Benchmark Selector**: dropdown com ícone, seleção única
- **Model Selector**: input de busca com debounce, seleção múltipla opcional
- **Metric Filter**: dropdown ou slider range, mínimo/máximo
- **Clear Filters**: botão de reset du mini claro opaco
- **Active Filter Badges**: chips removíveis que mostram o que está ativo

### RQ-03: Pesquisa
- Input com ícone de lupa, no header da tabela
- Search textual que filtra por nome do modelo (contains)
- Debounce 300ms antes de atualizar dados

### RQ-04: Paginação
- Items per page: opções 20 (default), 50, 100
- Controle: [First] [Prev] [1] ... [N] [Next] [Last]
- Info: "Showing X-Y of Z results"
- Mantém posição de scroll quando possível

### RQ-05: KPI Cards
- Grid de 4 cards no topo
- Cada card: ícone, label, valor with number formatting
- Tooltip explicando a (hover)
- Animação de entrada simples

### RQ-06: Tema
- Light theme (default detectado do sistema)
- Dark theme (switch toggle no header)
- Transição suave entre temas
- Persistência em localStorage
- Variáveis CSS em design tokens

---

## 3. Modelo de Dados

### Entidade: Evaluation

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID único |
| model_name | text | Nome do modelo (ex: "GPT-4o") |
| benchmark_type | text | "verified", "lite", "full" |
| resolved_rate | float | Taxa de issues resolvidas (0-100%) |
| avg_time_seconds | float | Tempo médio por task (s) |
| total_tasks | integer | Número total de tasks no benchmark |
| pass_k | integer | Número de pass@k (1, 10, 100) |
| date_added | timestamp | Data de inclusão |
| metadata | jsonb | Model info (provider, regions, etc.) |
| created_at | timestamptz | Timestamp automático |
| updated_at | timestamptz | Timestamp automático |

---

## 4. Requisitos Não Funcionais

### RNF-01: Performance
- LCP < 2.5s
- FID < 100ms
- CLS < 0.01

### RNF-02: Confiabilidade
- Fallback: se BD offline, exibe estado com mensagem (não quebra)
- Retry automático em falhas transitórias

### RNF-03: Escalabilidade
- Páginação server-side (não depende de cliente)
- Queries indexadas no PostgreSQL
- Cache de 5min via stale-while-revalidate

### RNF-04: Acessibilidade
- WCAG 2.1 AA mínimo
- Navegação completa via teclado
- Suporte completo a screen reader
- Foco visível e gerenciado

### RNF-05: Responsividade
- Breakpoints: 320px (mobile), 768px (tablet), 1024px (laptop), 1440px+ (desktop)
- Tabela → cards no mobile
- Filtros → modal/bottom sheet no mobile

---

## 5. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| UI | React 19 + Server Components |
| Estilo | Tailwind CSS 4 |
| Animação | CSS Animations (zero lib) |
| Dados | PostgreSQL 16 (Supabase) |
| Fetch | Server Actions + RSC |
| Testes | Vitest + Testing Library |
| Hosting | Vercel |