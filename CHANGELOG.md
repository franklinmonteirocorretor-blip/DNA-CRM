# Changelog — DNA CRM

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] — 2026-08 — Primeira Release de Produção

### Adicionado (13 módulos)

#### Módulos de negócio
- **Pipeline de Vendas**: 9 etapas com drag-and-drop e indicadores visuais
- **Central de Clientes 360°**: ficha completa, timeline, pipeline, scoring
- **Seguimento (Follow-up)**: priorização por score, caixa de entrada, sugestões inteligentes
- **Agenda**: visão mensal/semanal/diária, integração WhatsApp
- **Documentos**: checklist por etapa, validação de status
- **Financeiro**: comissões, VGV, previsão de proventos
- **Rankings**: pontuação gamificada, 8 tipos de ranking
- **Gestão**: KPIs por corretor, alertas, funil gerencial, resumo da operação
- **Equipes**: gestão de time, transferência de carteira

#### Módulos de inteligência
- **Central Operações**: fluxo ao vivo (Realtime), timeline, heatmap
- **BI Executivo**: 8 painéis consolidados (resumo, funil, ranking, funil de negócios, previsões, gargalos, timeline)
- **WhatsApp**: adapter pattern para provedores externos
- **Copiloto IA**: assistente inteligente baseado nos dados do CRM

#### Infraestrutura
- **Database**: 30 migrations, 24 tabelas, 16 políticas RLS, 5 triggers
- **Segurança**: auth Supabase, RLS em 100% das tabelas, requireAuth() em 21 funções
- **UX**: Dark Mode global, responsivo (mobile + desktop)
- **Qualidade**: TypeScript 0 erros, ESLint 0 erros, build Next.js limpo
- **Automações**: regras configuráveis com processamento assíncrono

### Tecnologias
- Next.js 16.2 (App Router, Turbopack)
- React 19, Tailwind CSS 4
- Supabase (Auth, DB, Storage, Realtime)
- TypeScript 5, Recharts 3
- next-themes 0.4

---