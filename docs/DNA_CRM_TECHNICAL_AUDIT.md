# DNA_CRM_TECHNICAL_AUDIT

**Sprint 0 — Auditoria Técnica Completa · v1.0 · 10/07/2026**
Escopo: fotografia fiel do sistema em produção (https://dna-crm-ruby.vercel.app). **Nenhum código foi alterado nesta auditoria — apenas documentação.**

Base auditada: repositório `dna-crm` (~4.400 linhas de TypeScript/TSX em `src/`), 14 migrações SQL, 9 suítes de teste unitário (67 testes) e 11 suítes de teste de banco.

---

## 1. Estrutura completa de pastas

```
dna-crm/
├── .env.example                  # Modelo de variáveis de ambiente
├── .env.local                    # Variáveis locais (não versionado em produção)
├── .github/workflows/ci.yml     # Pipeline CI (GitHub Actions)
├── .vercel/                      # Vínculo com o projeto Vercel
├── next.config.ts                # Config Next (bodySizeLimit 12mb p/ upload)
├── package.json / package-lock.json
├── postcss.config.mjs            # Tailwind v4 via PostCSS
├── tsconfig.json                 # TS estrito, alias @/* → src/*
├── producao-setup.sql            # Script de setup executado no Supabase
├── prisma/
│   └── schema.prisma             # Modelos (espelho da migração 0001)
├── supabase/migrations/          # 0001 → 0014 (fonte de verdade do banco)
├── docs/                         # mvp-1 … mvp-8 + BLUEPRINT-DNA-CRM-2.0 (.md/.pdf)
├── src/
│   ├── middleware.ts             # Sessão Supabase + proteção de rotas
│   ├── app/
│   │   ├── layout.tsx / page.tsx / globals.css
│   │   ├── (publico)/            # Rotas sem login
│   │   │   ├── login/            # page + actions (entrar/sair/recuperar)
│   │   │   ├── recuperar-senha/
│   │   │   └── atualizar-senha/
│   │   └── (app)/                # Rotas autenticadas (layout com header)
│   │       ├── painel/           # Dashboard diário do corretor
│   │       ├── gestao/           # Painel da Gestão (gerente/admin)
│   │       ├── clientes/         # Lista + actions
│   │       │   ├── novo/         # Triagem de atendimento + cadastro
│   │       │   └── [id]/         # Ficha, editar, cônjuge
│   │       │       └── documentos/  # Pasta digital (upload, checklist)
│   │       ├── agenda/           # Agenda do dia + novo agendamento
│   │       ├── atividades/       # actions de registro de atividade
│   │       └── perfil/           # Conta do usuário
│   ├── components/               # Componentes compartilhados (4)
│   └── lib/                      # Regras de negócio puras + clientes de infra
│       ├── agenda/ alertas/ atividades/ auth/ clientes/
│       ├── dashboard/ documentos/ leads/
│       ├── supabase/ (client.ts, server.ts)
│       └── prisma.ts
└── tests/
    ├── unit/                     # 9 suítes Vitest (67 testes)
    └── db/                       # 00_auth_stub + 11 suítes SQL + run-tests.sh
```

## 2. Tecnologias utilizadas

| Camada | Tecnologia | Versão | Observação |
|---|---|---|---|
| Framework web | Next.js (App Router) | 15.5.x | Server Components + Server Actions |
| UI | React | 19.1 | — |
| Linguagem | TypeScript | 5.8 (strict) | Alias `@/*` |
| Estilo | TailwindCSS | 4.1 | Tokens DNA (navy/gold/silver) em globals.css |
| Backend as a Service | Supabase | — | Auth, PostgreSQL, Storage, RLS |
| Banco | PostgreSQL 16 (Supabase, região sa-east-1 São Paulo) | — | Migrações SQL manuais |
| ORM | Prisma | 6.10 | **Somente tipos/valid.; não usado em runtime** (ver §18) |
| Testes | Vitest 4 + psql | — | Unit + SQL |
| Hospedagem | Vercel (serverless) | — | Deploy via CLI, projeto `dna-crm` |
| CI | GitHub Actions | — | 2 jobs: banco (Postgres 16) e build (unit + next build) |

## 3. Dependências

**Produção**: `@prisma/client` ^6.10 · `@supabase/ssr` ^0.12 · `@supabase/supabase-js` ^2.110 · `next` ^15.3.4 · `react` / `react-dom` ^19.1.

**Desenvolvimento**: `prisma` ^6.10 · `tailwindcss` + `@tailwindcss/postcss` ^4.1.10 · `typescript` ^5.8.3 · `vitest` ^4.1.10 · `@types/*`.

Avaliação: árvore mínima e saudável — 6 dependências de produção, zero bibliotecas de UI/gráficos/datas (motivo pelo qual não há gráficos no sistema). Sem vulnerabilidades conhecidas na data da auditoria.

**Variáveis de ambiente**: `DATABASE_URL` (pooler 6543, transaction mode) · `DIRECT_URL` (5432, só migrações) · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_SITE_URL`.

## 4. Banco de dados

- PostgreSQL 16 gerenciado pelo Supabase (projeto `aicoefdapijbrrweujob`, São Paulo).
- **Fonte de verdade: as migrações SQL** (`supabase/migrations/0001…0014`), aplicadas manualmente no SQL Editor. O Prisma é consumidor (regra documentada no schema).
- Storage: bucket privado `documentos` (acesso via URLs assinadas de 15 min).
- 19 funções PL/pgSQL e 22 triggers implementam o "Motor de Produção": toda ação comercial credita KPIs, atualiza funil e grava auditoria **sem código de aplicação**.
- Migrações idempotentes (`add value if not exists`, `add column if not exists`) — reaplicáveis com segurança.

**Histórico de migrações**: 0001 fundação (9 tabelas + enums + RLS + triggers) · 0002 provisionamento auth · 0003 auditoria/timeline · 0004 hardening atividades · 0005 agenda⇄funil · 0006 pasta de documentos · 0007 alertas/última atividade · 0008 triagem (tabela leads) · 0009 CLT/dependentes boolean · 0010 CPF opcional + nascimento · 0011 pasta RG+CPF unificado · 0012 comprovante de endereço · 0013 certidões + docs de dependentes · 0014 grau de parentesco.

## 5. Tabelas

| Tabela | Papel | Colunas-chave |
|---|---|---|
| `usuarios` | Equipe (espelha auth.users) | perfil (CORRETOR/GERENTE/ADMINISTRADOR), gerente_id (hierarquia), ativo, deleted_at |
| `leads` | Triagem de atendimento | origem, fez_ligacao, ligou_whatsapp, deixou_mensagem, seguiu, motivo_nao_seguiu, convertido_cliente_id |
| `clientes` | Cliente qualificado | etapa_atual, renda, saldo_fgts, tres_anos_clt, possui_dependente, data_nascimento, regiao_interesse, forma_renda, empreendimento_interesse (texto), proxima_acao(_em), pasta_completa_em, ultima_atividade_em, corretor_responsavel_id |
| `conjuges` | Cônjuge (1:1 com cliente) | renda, saldo_fgts, tres_anos_clt |
| `atividades` | Ligações/WhatsApp/Follow-ups | tipo, resultado, observacao |
| `agendamentos` | Visitas agendadas | data_hora, status (AGENDADO/CONFIRMADO/REMARCADO/CANCELADO) |
| `comparecimentos` | Desfecho da visita (1:1 agendamento) | resultado, motivo_ausencia |
| `documentos` | Pasta digital | tipo (13 valores), arquivo_url, de_dependente, grau_parentesco, status_validacao, deleted_at |
| `producao_diaria` | KPIs por corretor/dia (única linha por usuário+data) | ligacoes, whatsapp, follow_ups, agendamentos, comparecimentos, pastas, comparecimentos_feirao, aprovacoes, vendas, pontuacao_gamificacao (coluna gerada) |
| `historico_acoes` | Auditoria imutável | entidade, entidade_id, acao, dados_anteriores/novos (JSONB), usuario_id |

**Enums**: perfil_usuario · etapa_funil (10 valores — inclui AGENDAMENTO e COMPARECIMENTO, ver §18) · resultado_analise · tipo_atividade · status_agendamento · resultado_comparecimento · tipo_documento · status_validacao_doc · acao_auditoria · origem_atendimento · motivo_nao_atendimento.

## 6. Relacionamentos

```
usuarios ──< usuarios (gerente_id — hierarquia gerente→equipe)
usuarios ──< clientes (corretor_responsavel_id)
usuarios ──< leads (corretor_id)
leads    ──1 clientes (convertido_cliente_id, unique — lead que virou cadastro)
clientes ──1 conjuges (cliente_id unique)
clientes ──< atividades >── usuarios
clientes ──< agendamentos >── usuarios (corretor_id)
agendamentos ──1 comparecimentos (agendamento_id unique)
clientes ──< documentos >── usuarios (enviado_por)
usuarios ──< producao_diaria (unique usuario_id+data)
historico_acoes → (entidade, entidade_id) polimórfico, sem FK
```

Cadeias automáticas (trigger): `atividades/leads INSERT → producao_diaria` · `agendamentos INSERT → producao + funil → etapa` · `comparecimentos INSERT → producao + funil` · `documentos INSERT → fn_pasta_completa → pasta_completa_em + producao.pastas` · `clientes UPDATE p/ FECHAMENTOS → producao.vendas` · toda escrita relevante → `historico_acoes` e `ultima_atividade_em`.

## 7. Autenticação

- **Supabase Auth** (e-mail + senha), cookies de sessão gerenciados por `@supabase/ssr`.
- `src/middleware.ts`: renova sessão em toda request; sem sessão → redireciona rota privada para `/login`; com sessão → bloqueia `/login` e `/recuperar-senha`.
- Rotas públicas declaradas em `lib/auth/rotas.ts` (`/login`, `/recuperar-senha`, `/atualizar-senha`).
- Recuperação de senha por e-mail com redirect para `/atualizar-senha` (usa `NEXT_PUBLIC_SITE_URL`).
- Provisionamento: trigger `on_auth_user_created` → `handle_novo_usuario()` cria a linha em `usuarios` automaticamente no primeiro login (migração 0002).
- Não há: MFA, OAuth social, convite formal de usuários (criação é manual no Supabase), expiração de sessão customizada.

## 8. Controle de permissões

Autorização 100% no banco via **Row Level Security** (todas as tabelas com RLS habilitado):

| Papel | Alcance |
|---|---|
| ADMINISTRADOR | Tudo (`is_admin()`) |
| GERENTE | Os próprios registros + os da equipe (`e_gerente_de(corretor_id)`) |
| CORRETOR | Somente os próprios registros (`auth.uid()`) |

- 21 policies distribuídas nas migrações; funções auxiliares `is_admin()` e `e_gerente_de()` são `security definer`.
- Funções de trigger `security definer` para escrever em `producao_diaria`/`historico_acoes` sem abrir as tabelas.
- Na aplicação, a única checagem de UI é o perfil para exibir o link/página `/gestao` (a proteção real permanece no RLS).
- Lacuna: não há política de UPDATE/DELETE para `producao_diaria` além de leitura (correto — só triggers escrevem), mas também não há tela de contestação.

## 9. APIs

- **Não existem rotas REST/GraphQL próprias** (`app/api/*` vazio). Toda mutação usa **Next.js Server Actions** (17 ações):
  - `login/actions.ts`: `entrar`, `sair`, `enviarRecuperacao`, `atualizarSenha`
  - `clientes/actions.ts`: `criarCliente`, `atualizarCliente`, `mudarEtapa`, `assinarFichaProposta`, `salvarConjuge`
  - `clientes/novo/actions-triagem.ts`: `registrarTriagem`
  - `atividades/actions.ts`: `registrarAtividade`, `buscarClientes`
  - `agenda/actions.ts`: `criarAgendamento`, `mudarStatusAgendamento`, `registrarComparecimento`
  - `documentos/actions.ts`: `enviarArquivo`, `enviarDocumento` (legado), `removerDocumento`, `urlDocumento` (não usada)
  - `perfil/actions.ts`: `salvarPerfil`
- APIs externas consumidas: Supabase (PostgREST + Auth + Storage). Nenhuma outra integração (sem WhatsApp API, sem portais de leads, sem e-mail transacional próprio).
- Config relevante: `serverActions.bodySizeLimit: "12mb"` (uploads de fotos).

## 10. Componentes React

**Compartilhados (`src/components/`)**: `fab-registrar` (botão flutuante de registro rápido) · `registrar-atividade` (bottom sheet de atividade com busca de cliente) · `contato-cliente` (botões ligar/WhatsApp) · `input-moeda` (máscara R$ automática).

**Locais a rotas**: `form-cliente` (cadastro/edição) · `triagem` (assistente de triagem em fases) · `form-conjuge` · `form-upload` (multi-arquivo + câmera + grau de parentesco) · `acoes-documento` (remover) · `form-agendamento` · `item-agenda` (status/desfecho) · `perfil/form`.

Padrão: páginas são **Server Components** (buscam dados e passam props); interatividade isolada em **Client Components** pequenos. Sem biblioteca de componentes externa; estilização direta com Tailwind.

## 11. Hooks

- **Não há hooks customizados** (`use*` próprios: zero).
- Hooks nativos utilizados: `useState`, `useTransition`, `useRef`, `useActionState` (forms), `useRouter` (refresh pós-ação).
- Consequência direta da arquitetura server-first: pouco estado no cliente. Adequado ao tamanho atual; o Blueprint 2.0 (kanban, modo turbo) exigirá hooks próprios (ex.: `useFilaProspeccao`).

## 12. Contextos

- **Nenhum Context Provider** no projeto (nem tema, nem auth no cliente).
- Identidade do usuário resolve-se no servidor a cada request (`supabase.auth.getUser()` no layout e nas actions).
- Não há estado global de cliente; cada tela busca o que precisa. Sem React Query/SWR/Zustand.

## 13. Rotas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | pública | Redireciona conforme sessão |
| `/login` · `/recuperar-senha` · `/atualizar-senha` | públicas | Autenticação |
| `/painel` | C/G/A | Dashboard diário do corretor (rota inicial) |
| `/gestao` | G/A (corretor é redirecionado) | Funil consolidado + metas por corretor |
| `/clientes` | C/G/A | Lista com filtro por etapa |
| `/clientes/novo` | C/G/A | Triagem → cadastro |
| `/clientes/[id]` | dono/gerente/admin | Ficha do cliente (etapa, qualificação, cônjuge, alertas) |
| `/clientes/[id]/editar` | idem | Edição da qualificação |
| `/clientes/[id]/documentos` | idem | Pasta digital + dependentes |
| `/agenda` · `/agenda/novo` | C/G/A | Agenda do dia + criação |
| `/perfil` | todos | Nome/telefone + sair |

Total: **13 rotas** (3 públicas, 10 autenticadas). Proteção dupla: middleware (sessão) + RLS (dados).

## 14. Serviços

Camada `src/lib/` — regras de negócio **puras e unit-testadas**, espelhando as funções do banco:

| Módulo | Responsabilidade |
|---|---|
| `supabase/server.ts` / `client.ts` | Fábricas do cliente Supabase (SSR com cookies / browser) |
| `prisma.ts` | Singleton do Prisma Client (**não utilizado em runtime** — ver §18) |
| `auth/validacao.ts` · `auth/rotas.ts` | Validações de login e mapa de rotas públicas |
| `clientes/etapas.ts` | Funil oficial: ordem, rótulos, transições válidas |
| `clientes/validacao.ts` | CPF (cônjuge), idade/nascimento, máscara de moeda |
| `leads/triagem.ts` | Origens, motivos de não-atendimento, regiões, formas de renda |
| `atividades/registro.ts` | Tipos, resultados sugeridos, metas fixas, mensagens de progresso |
| `agenda/regras.ts` | Máquina de status do agendamento, janelas de dia, datas |
| `dashboard/metas.ts` | Metas diárias, resumo de KPIs, % do dia, saudação |
| `alertas/regras.ts` | Dias sem retorno (padrão 3), sem próxima ação, resumo |
| `documentos/pasta.ts` | Tipos de documento, checklist essencial, graus de parentesco, validação de arquivo |

## 15. Telas

1. **Login / Recuperar / Atualizar senha** — completas.
2. **Painel do corretor** — KPIs do dia (feito/meta), saudação, alertas simples, atalhos.
3. **Painel da Gestão** — funil consolidado (barras), triagens do dia, tabela de metas por corretor.
4. **Clientes (lista)** — cards com etapa, filtro por etapa, telefone acionável.
5. **Triagem / Novo atendimento** — fluxo em fases (dados → seguiu? → cadastro | motivo).
6. **Cadastro/edição de cliente** — qualificação completa + cônjuge condicional.
7. **Ficha do cliente** — dados, etapa com transições válidas, alertas, ficha/proposta.
8. **Documentos / Pasta digital** — checklist, câmera, multi-upload, dependentes com grau, "Ver ↗" em nova aba.
9. **Agenda** — dia com navegação, status do agendamento, registro de comparecimento.
10. **Novo agendamento** — cliente + data/hora + empreendimento.
11. **Perfil** — nome/telefone/sair.

## 16. Funcionalidades prontas

- Autenticação completa (login, logout, recuperação, provisionamento automático de usuário).
- Triagem de atendimento com crédito automático de ligações/WhatsApp e conversão em cadastro pré-preenchido.
- CRUD de clientes com funil de 10 etapas e validação de transições (frente/trás com regras).
- Qualificação: renda/FGTS com máscara R$, 3+ anos CLT, dependentes, nascimento (alerta de idade), cônjuge, região e forma de renda.
- Registro de atividades (ligação/WhatsApp/follow-up) via FAB com progresso da meta.
- Agenda com máquina de status e comparecimento sincronizando funil + KPI.
- Pasta digital: checklist essencial, foto pela câmera, multi-upload identificado, documentos de dependentes com grau de parentesco (até 3º grau), pasta completa automática (KPI + carimbo).
- Motor de produção 100% automático (triggers) alimentando `producao_diaria`.
- Auditoria automática (`historico_acoes`) e `ultima_atividade_em` para alertas.
- Painéis: corretor (dia) e gestão (funil + metas por corretor).
- RLS completo em três níveis; storage privado com URL assinada.
- CI com migração + testes de banco + testes unitários + build.

## 17. Funcionalidades incompletas

| Item | Estado | O que falta |
|---|---|---|
| Painel da Gestão | básico | Não responde às perguntas de gestão (projeção, gargalo, quem precisa de ajuda) — substituído no Blueprint 2.0 (T-15) |
| Alertas | parcial | Regras existem (`lib/alertas`) e aparecem na ficha/painel, mas não há central de notificações nem push |
| Comparecimento de feirão | só banco | Coluna `comparecimentos_feirao` existe; **nenhuma tela registra** |
| Aprovações (KPI) | só banco | Coluna `aprovacoes` existe; sem crédito automático ligado à etapa APROVADOS |
| Validação de documentos | só banco | `status_validacao` (PENDENTE/VALIDADO/REJEITADO) sem tela nem papel de validador |
| Resultado da análise | parcial | Enum `resultado_analise` gravável, sem fluxo dedicado de análise de crédito |
| Ficha/proposta | parcial | Flag `ficha_proposta_assinada` na ficha; simulador/PDF de proposta documentado (doc 08/09) mas fora do app |
| Pontuação de gamificação | só banco | Coluna gerada `pontuacao_gamificacao` calculada; sem ranking/tela |
| Perfil | raso | Sem foto, sem preferências, sem troca de senha logado |
| Busca de clientes | parcial | `buscarClientes` existe para o FAB; não há busca global |

## 18. Dívidas técnicas

1. **Prisma desatualizado e não utilizado em runtime.** `schema.prisma` espelha apenas a migração 0001: não tem o model `Lead`, nem `data_nascimento`, `tres_anos_clt`, `possui_dependente`, `de_dependente`, `grau_parentesco`, e ainda declara `cpf` como obrigatório/único (o banco já o tem opcional). Zero imports de `@/lib/prisma` no código (runtime usa supabase-js). Decidir: atualizar via `db pull` ou remover a dependência.
2. **Enum `etapa_funil` contém AGENDAMENTO e COMPARECIMENTO** — o pipeline oficial do Blueprint 2.0 os trata como eventos, não etapas. Exigirá migração de dados (mapeamento para CONTATOS) — já previsto (questionamento Q2 do Blueprint).
3. **Metas fixas no código** (`METAS_DIA_MVP`, `METAS_DIARIAS_FIXAS`, `DIAS_SEM_RETORNO`). Mudar meta = deploy. (Também: WhatsApp = 40 no código; especificação em revisão — Q3.)
4. **Fuso horário**: `janelaDoDia`/`hojeISO` usam o relógio do servidor (UTC na Vercel). **O "dia" da produção vira às 21h de Brasília** — afeta agenda e KPIs noturnos.
5. **Fluxo duplicado de upload**: `enviarDocumento` (1 arquivo, legado) convive com `enviarArquivo` (múltiplo); `urlDocumento` ficou órfã após o "Ver ↗" server-side.
6. **Consulta da gestão com `limit(2000)`** em clientes e sem paginação — teto silencioso quando a carteira crescer.
7. **Token da Vercel foi compartilhado em chat** durante o deploy assistido — **revogar e rotacionar** após estabilização (pendência de segurança já registrada).
8. **Sem observabilidade**: nenhum Sentry/log estruturado; diagnóstico depende de `vercel logs`.
9. **Sem componentes de gráfico** — qualquer dashboard novo exigirá adotar biblioteca (decisão de arquitetura da Fase 1 do 2.0).
10. **`empreendimento_interesse` é texto livre** — dado inconsistente para BI (resolvido pelo módulo Empreendimentos do 2.0).
11. Testes de banco rodam em Postgres "puro" com stub de `auth` — bom para CI, mas não exercitam o GoTrue real.

## 19. Bugs conhecidos

| # | Bug | Gravidade | Situação |
|---|---|---|---|
| B1 | Virada do dia às 21h (BRT) nos KPIs/agenda por UTC (ver §18.4) | média | aberto — corrigir na Fase 1 do 2.0 |
| B2 | "CPF (avulso)" segue no dropdown de upload, redundante com "RG e CPF" | baixa | aberto (remoção aprovada no Blueprint) |
| B3 | Cliente criado sem próxima ação não gera nenhuma cobrança até o alerta de 3 dias | baixa | comportamento aceito no MVP; Blueprint torna próxima ação obrigatória |
| B4 | Após deploy, sessões abertas podem exibir erro de client-side até hard refresh (version skew do Next) | baixa | mitigado com Ctrl+Shift+R; sem tratamento automático |
| B5 | `registrarComparecimento` de agendamento CANCELADO é bloqueado, mas REMARCADO permite duplo desfecho em reagendamentos sucessivos do mesmo cliente (1:1 é por agendamento, não por visita) | baixa | aberto |

Histórico (já corrigidos em produção): erro 413 em upload >1 MB (bodySizeLimit) · "Ver" não abria documento (URL assinada server-side em nova aba) · erro ao anexar documento de dependente (enum em transação) — todos com teste de regressão.

## 20. Melhorias sugeridas

**Imediatas (Sprint 0/1 — sem novas funcionalidades):**
1. Corrigir fuso horário para `America/Sao_Paulo` nas janelas de dia (B1).
2. Atualizar ou remover o Prisma (dívida 1) — recomendação: `prisma db pull` + manter só como tipagem, ou remover e ganhar build mais leve.
3. Remover `enviarDocumento`/`urlDocumento` legados e o tipo "CPF (avulso)".
4. Revogar/rotacionar o token Vercel e mover segredos para o painel.
5. Adicionar Sentry (ou equivalente) antes da reconstrução da UI.

**Estruturais (já contempladas no Blueprint 2.0 aprovado para discussão):**
6. Migração do enum de etapas (AGENDAMENTO/COMPARECIMENTO → eventos) com script de mapeamento de dados.
7. Metas/SLAs em tabela de configuração (T-21) em vez de constantes.
8. Entidade `empreendimentos` + `unidades` substituindo o texto livre.
9. Biblioteca única de gráficos + design system (componentes canônicos §2.4 do Blueprint).
10. Paginação/virtualização nas listas e agregações via views materializadas para dashboards.
11. Central de notificações + push (base para o Motor de Alertas completo).
12. Crédito automático do KPI `aprovacoes` no trigger de mudança de etapa (fechando o ciclo dos 9 KPIs).

---

**Conclusão da Sprint 0**: o sistema tem fundação sólida (banco, motor automático, segurança, testes) e uma camada de experiência fina, com 10 pendências estruturais mapeadas e 5 bugs conhecidos de baixa/média gravidade. Nenhum impeditivo para iniciar a Fase 1 do DNA CRM 2.0; os itens 1-5 das melhorias imediatas devem entrar antes ou junto com ela.

*Auditoria produzida sem qualquer alteração de código. · DNA CRM · Sprint 0 · 10/07/2026*
