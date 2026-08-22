# Inventário de consolidação do worktree

Data: 2026-08-22

Fonte: `git status --porcelain=v1 -uall` antes dos commits de consolidação.

## A. CRM/JORNADA

- `M app/agenda/agenda-history.css`
- `M app/agenda/agenda.css`
- `M app/agenda/attendance-outcome.css`
- `M app/agenda/page.tsx`
- `M app/analises/analises.css`
- `M app/analises/analysis-queue.css`
- `M app/analises/distribution-override.css`
- `M app/analises/distribution.css`
- `M app/analises/management-metrics.css`
- `M app/analises/page.tsx`
- `M app/api/analyses/route.ts`
- `M app/api/appointments/route.ts`
- `M app/api/auth/login/route.ts`
- `M app/api/auth/logout/route.ts`
- `M app/api/clients/[id]/events/route.ts`
- `M app/api/clients/[id]/route.ts`
- `M app/api/clients/route.ts`
- `M app/api/closing/route.ts`
- `M app/api/closing/simulation/route.ts`
- `M app/api/daily-portfolio/route.ts`
- `M app/api/documents/route.ts`
- `M app/api/finance/route.ts`
- `M app/api/metrics/export/route.ts`
- `M app/api/metrics/route.ts`
- `M app/api/post-sale/events/route.ts`
- `M app/carteira/carteira-fixes.css`
- `M app/carteira/carteira.css`
- `M app/carteira/page.tsx`
- `M app/clientes/[id]/ficha.css`
- `M app/clientes/[id]/page.tsx`
- `M app/clientes/clientes.css`
- `M app/clientes/layout.tsx`
- `M app/clientes/nicolle/cadence-notifications.css`
- `M app/clientes/nicolle/cliente.css`
- `M app/clientes/nicolle/credit-analysis-tools.css`
- `M app/clientes/nicolle/credit-status.css`
- `M app/clientes/nicolle/flow-order.css`
- `M app/clientes/nicolle/guidance.css`
- `M app/clientes/nicolle/notifications.css`
- `M app/clientes/nicolle/page.tsx`
- `M app/clientes/page.tsx`
- `M app/components/crm-navigation.tsx`
- `M app/components/formatted-number-input.tsx`
- `M app/components/phone-icon.tsx`
- `M app/components/profile-photo-provider.tsx`
- `M app/crm-standard.css`
- `M app/dashboard-action-fixes.css`
- `M app/dashboard-funnel-fix.css`
- `M app/dashboard-funnel.css`
- `M app/dashboard-interactions.css`
- `M app/dashboard-nav.css`
- `M app/fechamento/fechamento.css`
- `M app/fechamento/page.tsx`
- `M app/fechamento/property-media.css`
- `M app/financeiro/financeiro.css`
- `M app/financeiro/page.tsx`
- `M app/follow-ups/followups.css`
- `M app/follow-ups/page.tsx`
- `M app/funil/funil-fixes.css`
- `M app/funil/funil.css`
- `M app/funil/page.tsx`
- `M app/globals.css`
- `M app/indicadores/funnel-export.css`
- `M app/indicadores/funnel-layout-fix.css`
- `M app/indicadores/funnel-premium.css`
- `M app/indicadores/indicadores.css`
- `M app/indicadores/page.tsx`
- `M app/layout.tsx`
- `M app/login/login.css`
- `M app/login/page.tsx`
- `M app/page.tsx`
- `M app/pos-venda/PostSaleStagePanel.tsx`
- `M app/pos-venda/evidence-upload.css`
- `M app/pos-venda/journey-detail.css`
- `M app/pos-venda/page.tsx`
- `M lib/db.ts`
- `M lib/session.ts`
- `M lib/supabase-admin.ts`
- `M lib/upload-client-document.ts`
- `?? app/api/follow-ups/route.ts`
- `?? app/api/funnel/route.ts`
- `?? app/components/crm-center-tabs.tsx`
- `?? app/components/daily-mission-tabs.tsx`
- `?? lib/client-journey.ts`
- `?? lib/closing-math.ts`

## B. BASES/PARCEIROS

- `M app/api/base-summary/route.ts`
- `M app/api/catalog/media/route.ts`
- `M app/bases/manual-entry.css`
- `M app/bases/media-integrations.css`
- `M app/bases/product-distribution.css`
- `M app/bases/production-fixes.css`
- `M app/ccas/ccas.css`
- `M app/construtoras/construtoras.css`
- `M app/construtoras/editing.css`
- `M app/construtoras/management.css`
- `?? lib/catalog-hierarchy.ts`

## C. FUNDAÇÃO DO AGENTE

- `?? AGENT_IMPLEMENTATION_PLAN.md`
- `?? lib/agent/action-pipeline.ts`
- `?? lib/agent/confidence-gate.ts`
- `?? lib/agent/lead-stage.ts`
- `?? lib/agent/policy-engine.ts`
- `?? lib/agent/priority-queue.ts`
- `?? lib/agent/store.ts`
- `?? lib/agent/types.ts`

## D. WHATSAPP CRM

- `?? app/api/agent/control/route.ts`
- `?? app/api/agent/conversations/[id]/control/route.ts`
- `?? app/api/agent/tasks/route.ts`
- `?? app/api/agent/whatsapp/inbound/route.ts`
- `?? app/api/agent/whatsapp/outbound/route.ts`
- `?? app/api/agent/whatsapp/session/route.ts`
- `?? app/configuracoes/whatsapp/page.tsx`
- `?? app/configuracoes/whatsapp/whatsapp.css`
- `?? lib/agent/whatsapp/gateway-client.ts`
- `?? lib/agent/whatsapp/identity-resolver.ts`
- `?? lib/agent/whatsapp/simulation-provider.ts`
- `?? lib/agent/whatsapp/types.ts`

## E. WHATSAPP GATEWAY

- Nenhum arquivo.

## F. MIGRATIONS

- `?? supabase/migrations/20260815022315_client_journey_and_qualification.sql`
- `?? supabase/migrations/20260815031642_add_cca_analysts.sql`
- `?? supabase/migrations/20260815121043_add_cca_contacts_and_regions.sql`
- `?? supabase/migrations/20260816014251_add_project_city.sql`
- `?? supabase/migrations/20260816134029_add_sale_cancellation_audit.sql`
- `?? supabase/migrations/20260816143048_agent_structural_a.sql`
- `?? supabase/migrations/20260816143145_agent_structural_a_indexes.sql`
- `?? supabase/migrations/20260816154110_agent_whatsapp_sprint_b.sql`

## G. TESTES

- `?? scripts/verify-production.mjs`
- `?? tests/agent-foundation.test.ts`
- `?? tests/agent-whatsapp.test.ts`
- `?? tests/closing-math.test.ts`

## H. DOCUMENTAÇÃO

- `M PROJECT_STATE.md`
- `?? CRM_JOURNEY_IMPLEMENTATION.md`
- `?? docs/WHATSAPP_B1_RUNBOOK.md`
- `?? docs/WHATSAPP_B1_VALIDATION_REPORT.md`
- `?? docs/WHATSAPP_B2_VALIDATION_REPORT.md`
- `?? docs/WHATSAPP_PROVIDER_DECISION.md`

## I. ARTEFATOS GERADOS

- Nenhum arquivo.

## J. ALTERAÇÕES ANTIGAS/NÃO RELACIONADAS

- Nenhum arquivo.

## K. DÚVIDA/INFRAESTRUTURA

- `M .gitignore`
- `M package-lock.json`
- `M package.json`
- `M scripts/ensure-test-client.mjs`
- `M scripts/migrate-to-supabase.mjs`
- `M tsconfig.json`
- `?? scripts/fix-mojibake.mjs`

## Decisões

- Artefatos gerados ficam fora dos commits e cobertos por `.gitignore`.
- Nenhum arquivo foi removido ou descartado.
- Itens de infraestrutura exigem revisão conjunta com os domínios dependentes.
- Migrations serão versionadas sem reescrever migrations históricas já aplicadas.

