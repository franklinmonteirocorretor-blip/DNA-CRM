# SWE-Bench Dashboard — Implementation Plan

## Overview

Phased implementation of a Next.js App Router dashboard to display SWE-Bench evaluation results.

**Duration**: 3 sprints (2 weeks each)
**Branch**: `feature/swe-bench-dashboard`

---

## FASE 1: Estrutura do Projeto e Setup

### Objetivo
Setup completo Next.js com App Router, layout, tema, design tokens e componentes base.

### Tasks
1. **Scaffold project structure**
   - Diretórios: `app/swe-bench/`, `src/components/swe-bench/`, `src/types/swe-bench.ts`, `src/lib/swe-bench/`
   - Layout base Route Group `(swe-bench)`
2. **Design tokens**
   - CSS custom properties
   - Tailwind CSS config com tokens
3. **Theme provider**
   - next-themes integration
   - Toggle header com detecção do sistema
4. **Base layout**
   - Dashboard layout (header, main, footer)
   - Responsive grid
5. **Type definitions**
   - TypeScript interfaces: Evaluation, FilterState, SortConfig, Pagination

### Deliverables
- Estrutura de pastas completa
- Tokens CSS funcionais
- Layout principal renderizado
- Type system definido

---

## FASE 2: Design System

### Objetivo
Construir todos os componentes visuais do sistema de design.

### Componentes para Implementar

| Componente | Props | Variant | Pending |
|-----------|-------|---------|---------|
| **Button** | variant, size, isLoading, disabled, icon | primary, secondary, ghost, danger | |
| **Card** | padding, shadow, hover, clickable | default, interactive | |
| **Badge** | color, size, removable | default, success, warning, error | |
| **Table** | columns, data, sortable, onSort | default, compact, striped | |
| **Input** | type, icon, error, disabled, debounce | default, search, mini | |
| **Select** | options, disabled, placeholder | default, inline | |
| **Dropdown** | trigger, alignment, items | list, menu, rich | |
| **Tabs** | tabs, active, onChange | default, underline, pills | |
| **Pagination** | total, page, pageSize, onPageChange | default, compact | |
| **Modal** | open, onClose, size, children | default, sheet (mobile) | |
| **Tooltip** | content, position, delay | top, right, bottom, left | |
| **Skeleton** | width, height, variant | text, circle, rectangle, row | |
| **EmptyState** | icon, title, description, action | default, default | |
| **ErrorState** | title, description, action, retry | default, default | |
| **Loading** | size, color, label | spinner, dots, line | |
| **KPI Card** | icon, label, value, subtext, trend | default, compact | |

---

## FASE 3: Dashboard

### Objetivo
Implementar toda a página do leaderboard com interações.

### Tasks
1. **Leaderboard table** — Tabela ordenável com todos os dados
2. **KPI Cards grid** — 4 cards com métricas de resumo
3. **Filter bar** — Benchmark selector, Model search, Metric filter
4. **Search input** — search com debounce 300ms
5. **Pagination** — Controle completo de paginação
6. **Sorting** — Ordenação por coluna
7. **Filter chips** — Removable active filter badges
8. **Responsive layout** — Mobile adaptativo, cards no lugar de tabela
9. **URL state sync** — Filtros e pagination reflected in URL params

---

## FASE 4: Backend

### Objetivo
Schema PostgreSQL, queries, server actions para alimentar o dashboard.

### Tasks
1. **Database schema** — Create migration or DB schema
2. **Type definitions** — TypeScript types que alinham com DB
3. **Repository layer** — src/lib/swe-bench/repository com todas as queries
4. **Service layer** — src/lib/swe-bench/service: abstração lógica
5. **Server Actions** — Criação de actions fetchAndCache por server
6. **Caching strategy** — TTL 5min, stale-while-revalidate via next/cache
7. **Seed data** — Script SQL para popular avaliação de 50+ modelos com dados realistas

### Queries

```sql
-- Get evaluations with filters
SELECT * FROM evaluations
WHERE 
  (:benchmark IS NULL OR benchmark_type = :benchmark) AND
  (:search IS NULL OR model_name ILIKE '%' || $s || '%') AND
  (:min_rate IS NULL OR resolved_rate >= :min_rate) AND
  (:max_rate IS NULL OR resolved_rate <= :max_rate)
ORDER BY 
  CASE WHEN :sort = 'resolved_rate' AND :order = 'desc' THEN resolved_rate END DESC,
  CASE WHEN :sort = 'resolved_rate' AND :order = 'asc' THEN resolved_rate END ASC,
  CASE WHEN :sort = 'avg_time' AND :order = 'desc' THEN avg_time_seconds END DESC
OFFSET :offset
LIMIT :limit;
```

---

## FASE 5: UX

### Objetivo
Polimento UX completo com loading, empty, errors, optimistic UI.

### Tasks
1. **Skeleton loading** — Tabela skeleton durante carregamento
2. **Empty state** — "No results found" state visual
3. **Error state** — "Something went wrong" com retry click
4. **Optimistic UI** — Ações de filtro/sort instantaneas no client
5. **Keyboard navigation** — setas up/down/enter na tabela
6. **Responsive fine-tuning** — Teste em 5 breakpoints
7. **Dark mode polish** — Transition suave entre temas

---

## FASE 6: Performance

### Objetivo
Otimizar performance.

### Tasks
1. **Server Components por default** — Table rendering RSC
2. **Streaming & Suspense** — Suspense boundaries para dados
3. **Lazy loading** — Carregamento lazy de componentes
4. **Memoization** — useMemo/useCallback só onde necessário comprovado
5. **Re-render prevention** — Os patterns corretos de hooks
6. **Cache strategy** — TTL de 5min com revalidate on-demand

---

## FASE 7: Acessibilidade

### Objetivo
WCAG 2.1 AA compliance.

### Tasks
1. **Landmarks** — header, main, nav, footer region tags
2. **Labels** — aria-label em todos os elementos sem texto visível
3. **Focus management** — Trap focus em modal, restaurar após fechar
4. **Tab order** — Sequência lógica: header > filters > table > pagination
5. **Screen readers** — aria-live regions para atualizações de filtro
6. **Contrast** — audit todas as combinações de cores ≥4.5:1
7. **Semantic HTML** — tabela uses caption, thead, tbody
8. **Skip link** — Primeiro link da página: "Skip to main content"

---

## Quality Gates (executado após cada fase)

```
npm run lint      # Zero warnings
npm run typecheck # Zero errors
npm run build     # Success
```

---

## Directory Structure (final)

```
app/swe-bench/
├── page.tsx           Main page
├── layout.tsx         Layout com providers
├── loading.tsx        Loading state
├── error.tsx          Error boundary
├── not-found.tsx      404
components/swe-bench/
├── ui/                Design system
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── table.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dropdown.tsx
│   ├── tabs.tsx
│   ├── pagination.tsx
│   ├── modal.tsx
│   ├── tooltip.tsx
│   ├── skeleton.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── loading.tsx
│   └── kpi-card.tsx
├── dashboard/
│   ├── leaderboard-table.tsx
│   ├── kpi-grid.tsx
│   ├── filter-bar.tsx
│   ├── search-input.tsx
│   ├── benchmark-selector.tsx
│   └── metric-selector.tsx
src/
├── types/swe-bench.ts
├── lib/swe-bench/
│   ├── repository.ts
│   ├── schema.sql
│   ├── seed.sql
│   ├── queries.ts
│   ├── actions.ts
│   └── cache.ts
└── config/
    └── swe-bench-constants.ts
```