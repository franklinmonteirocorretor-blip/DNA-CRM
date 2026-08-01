# DNA CRM — Sistema de Gestão Imobiliária

![versão](https://img.shields.io/badge/version-1.0.0-blue)
![status](https://img.shields.io/badge/status-produção-brightgreen)
![licença] (https://img.shields.io/badge/license-MIT-green)

## Sobre

O **DNA CRM** é um sistema de gestão de relacionamento com o cliente (CRM) focado no mercado imobiliário brasileiro. Projetado para corretores, gerentes e administradores de imobiliárias. Rastreia todo o ciclo de vida do cliente, desde o primeiro contato até o pós-venda, com dashboards, automações e inteligência operacional.

---

## Funcionalidades Principais

### 📊 Para Corretores
- Cadastro e gestão de clientes
- Pipeline visual com 9 etapas (drag-and-drop)
- Agenda integrada com WhatsApp
- Follow-up inteligente com priorização
- Documentação digital organizada por cliente
- Comunicações (WhatsApp, ligações) centralizadas

### 📈 Para Gerentes
- Painéis com KPIs de toda a equipe
- Ranking de produtividade e vendedores
- Transferência de carteira entre corretores
- Análise de funil e gargalos
- BI Executivo com 8 painéis
- Operações em tempo real

### 🧠 Inteligência
- Copiloto IA baseado em dados reais
- Sugestões automáticas de contatos prioritários
- Previsão de fechamento por cliente
- Pontuação (scoring) para priorização

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| **Linguagem** | TypeScript 5 |
| **Backend** | Server Actions (Next.js) |
| **Banco** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth |
| **Gráficos** | Recharts 3 |
| **Tempo Real** | Supabase Realtime (WebSocket) |
| **IA** | Provider Pattern (OpenAI, Claude, Gemini, DeepSeek) |

---

## Estrutura

```
/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── dashboard/                # Páginas do sistema
│   │   ├── agenda/              # Agenda
│   │   ├── automacoes/         # Regras de negócio
│   │   ├── bi/                 # BI Executivo
│   │   ├── clientes/           # CRUD de clientes
│   │   ├── copiloto/           # Copiloto IA
│   │   ├── corretores/         # Gestão de corretores
│   │   ├── documentos/         # Central de documentos
│   │   ├── empreendimentos/    # Cadastro de obras
│   │   ├── equipe/             # Gestão de equipes
│   │   ├── financeiro/         # Comissões
│   │   ├── followup/           # Segmento
│   │   ├── funil/              # Pipeline
│   │   ├── gestao/             # Gestão
│   │   ├── operacao/            # Operações (ao vivo)
│   │   ├── rankings/           # Rankings
│   │   ├── relatorios/          # Relatórios
│   │   └── whatsapp/            # Central WhatsApp
│   ├── api/                     # API endpoints
│   └── layout.tsx               # Layout principal
├── database/
│   └── migrations/               # 30 migrações SQL
├── src/
│   ├── ai/                      # AI Provider layer
│   ├── components/             # Componentes React
│   ├── config/                  # Configurações
│   ├── lib/
│   │   ├── auth/              # Auth guards
│   │   ├── automation/       # Motor de automação
│   │   ├── server/            # Queries e Supabase
│   │   └── score.ts           # Algoritmo de scoring
│   ├── services/                 # Camada de serviço
│   ├── types/                    # TypeScript definitions
│   └── utils/                    # Utilitários
├── tests/                         # Testes
└── docs/                          # Documentação
```

---

## Instalação Rápida

```bash
# 1. Clone
git clone <repo>
cd CRM

# 2. Instale
npm install

# 3. Configure variáveis
cp .env.example .env.local
# Edite .env.local com suas credenciais Supabase

# 4. Rode as migrations (via Supabase Dashboard ou script)
cd database/migrations/
<correr via > supabase start

# 5. Inicie o dev
npm run dev
```

---

## Build para Produção

```bash
npm run build   # Cria build de produção
npm start       # Servidor de produção
```

---

## Qualidade

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Build de produção |
| `npm run lint` | Verificação de linting |
| `npx tsc --noEmit` | Verificação de tipos |
| `npm test` | Testes unitários |

---

## Licença

MIT. Veja `LICENSE` para mais detalhes.

---

## Contribuição

Veja `CONTRIBUTING.md`.

---

## Segurança

- Todas as tabelas possuem RLS (Row-Level Security)
- Server Actions e APIs protegidas por autenticação
- Variáveis sensíveis nunca expostas ao frontend

---

**DNA CRM v1.0.0 — Pronto para Produção**