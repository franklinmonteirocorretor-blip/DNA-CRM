# DNA_CRM_PROJECT_TREE

**Árvore completa do projeto DNA CRM · Sprint 0 · 10/07/2026**
Gerada a partir do repositório em produção (excluídos: `node_modules/`, `.next/`, `.git/`).

```
dna-crm/
├── .github/
│   └── workflows/
│       └── ci.yml                        # CI: job de banco (Postgres 16 + migrações + testes SQL) e job de build (unit + next build)
│
├── .vercel/
│   ├── project.json                      # Vínculo com o projeto Vercel (dna-crm)
│   └── README.txt
│
├── docs/                                 # Documentação técnica dos módulos
│   ├── mvp-1-fundacao.md
│   ├── mvp-2-autenticacao.md
│   ├── mvp-3-clientes-funil.md
│   ├── mvp-4-atividades.md
│   ├── mvp-5-agenda.md
│   ├── mvp-6-dashboard.md
│   ├── mvp-7-documentos.md
│   ├── mvp-8-alertas.md
│   ├── BLUEPRINT-DNA-CRM-2.0.md          # Blueprint da rearquitetura (42 telas / 18 módulos)
│   ├── BLUEPRINT-DNA-CRM-2.0.pdf
│   ├── blueprint-pdf.css                 # Estilo usado na geração do PDF
│   └── blueprint.html                    # Intermediário da conversão MD→PDF
│
├── prisma/
│   └── schema.prisma                     # Modelos Prisma (espelho da migração 0001 — ver auditoria §18.1)
│
├── supabase/
│   └── migrations/                       # FONTE DE VERDADE do banco (aplicadas no SQL Editor)
│       ├── 0001_fundacao.sql             # 9 tabelas, enums, RLS, triggers do motor de produção
│       ├── 0002_auth_provisionamento.sql # handle_novo_usuario (auth.users → usuarios)
│       ├── 0003_auditoria_e_timeline.sql
│       ├── 0004_atividades_hardening.sql
│       ├── 0005_agenda_sincroniza_funil.sql
│       ├── 0006_documentos_pasta.sql     # Pasta digital + fn_pasta_completa
│       ├── 0007_alertas_ultima_atividade.sql
│       ├── 0008_triagem_atendimento.sql  # Tabela leads + crédito de KPIs na triagem
│       ├── 0009_clt_dependentes_bool.sql
│       ├── 0010_cpf_opcional_nascimento.sql
│       ├── 0011_pasta_rg_cpf_unificado.sql
│       ├── 0012_pasta_essencial_endereco.sql
│       ├── 0013_certidoes_dependentes.sql
│       └── 0014_grau_parentesco.sql
│
├── src/
│   ├── middleware.ts                     # Sessão Supabase + proteção de rotas
│   │
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (fontes, metadados)
│   │   ├── page.tsx                      # "/" → redireciona conforme sessão
│   │   ├── globals.css                   # Tailwind v4 + tokens DNA (navy/gold/silver)
│   │   │
│   │   ├── (publico)/                    # ---- ROTAS SEM LOGIN ----
│   │   │   ├── login/
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts            # entrar · sair · enviarRecuperacao · atualizarSenha
│   │   │   ├── recuperar-senha/
│   │   │   │   └── page.tsx
│   │   │   └── atualizar-senha/
│   │   │       └── page.tsx
│   │   │
│   │   └── (app)/                        # ---- ROTAS AUTENTICADAS ----
│   │       ├── layout.tsx                # Header (link Gestão p/ gerente+, nav, sair) + FAB
│   │       │
│   │       ├── painel/
│   │       │   └── page.tsx              # Dashboard diário do corretor (KPIs, alertas)
│   │       │
│   │       ├── gestao/
│   │       │   └── page.tsx              # Painel da Gestão (funil consolidado + metas por corretor)
│   │       │
│   │       ├── clientes/
│   │       │   ├── page.tsx              # Lista de clientes (filtro por etapa)
│   │       │   ├── actions.ts            # criarCliente · atualizarCliente · mudarEtapa · assinarFichaProposta · salvarConjuge
│   │       │   ├── form-cliente.tsx      # Formulário de cadastro/edição (client component)
│   │       │   ├── novo/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── triagem.tsx       # Assistente de triagem (origem → seguiu? → cadastro | motivo)
│   │       │   │   └── actions-triagem.ts # registrarTriagem
│   │       │   └── [id]/
│   │       │       ├── page.tsx          # Ficha do cliente (etapa, qualificação, alertas)
│   │       │       ├── form-conjuge.tsx
│   │       │       ├── editar/
│   │       │       │   └── page.tsx
│   │       │       └── documentos/
│   │       │           ├── page.tsx      # Pasta digital (checklist, enviados, dependentes)
│   │       │           ├── actions.ts    # enviarArquivo · enviarDocumento(legado) · removerDocumento · urlDocumento(órfã)
│   │       │           ├── form-upload.tsx # Câmera + multi-upload + grau de parentesco
│   │       │           └── acoes-documento.tsx
│   │       │
│   │       ├── agenda/
│   │       │   ├── page.tsx              # Agenda do dia (navegação, status, desfecho)
│   │       │   ├── actions.ts            # criarAgendamento · mudarStatusAgendamento · registrarComparecimento
│   │       │   ├── item-agenda.tsx
│   │       │   └── novo/
│   │       │       ├── page.tsx
│   │       │       └── form-agendamento.tsx
│   │       │
│   │       ├── atividades/
│   │       │   └── actions.ts            # registrarAtividade · buscarClientes (usado pelo FAB)
│   │       │
│   │       └── perfil/
│   │           ├── page.tsx
│   │           ├── form.tsx
│   │           └── actions.ts            # salvarPerfil
│   │
│   ├── components/                       # Componentes compartilhados
│   │   ├── fab-registrar.tsx             # Botão flutuante de registro rápido
│   │   ├── registrar-atividade.tsx       # Bottom sheet de atividade (busca cliente + tipo)
│   │   ├── contato-cliente.tsx           # Botões ligar / WhatsApp
│   │   └── input-moeda.tsx               # Input com máscara R$ automática
│   │
│   └── lib/                              # Regras de negócio puras (unit-testadas) + infra
│       ├── supabase/
│       │   ├── server.ts                 # Cliente Supabase SSR (cookies)
│       │   └── client.ts                 # Cliente Supabase browser
│       ├── prisma.ts                     # Singleton Prisma (não usado em runtime — auditoria §18.1)
│       ├── auth/
│       │   ├── rotas.ts                  # Rotas públicas + rota inicial
│       │   └── validacao.ts              # E-mail, senha, nome, telefone
│       ├── clientes/
│       │   ├── etapas.ts                 # Funil oficial: ordem, rótulos, transições válidas
│       │   └── validacao.ts              # CPF (cônjuge), idade, máscara de moeda
│       ├── leads/
│       │   └── triagem.ts                # Origens, motivos, regiões, formas de renda
│       ├── atividades/
│       │   └── registro.ts               # Tipos, metas fixas, mensagens de progresso
│       ├── agenda/
│       │   └── regras.ts                 # Máquina de status, janelas de dia (hojeISO/janelaDoDia)
│       ├── dashboard/
│       │   └── metas.ts                  # METAS_DIA_MVP, resumoKpis, percentualDia
│       ├── alertas/
│       │   └── regras.ts                 # Dias sem retorno, sem próxima ação
│       └── documentos/
│           └── pasta.ts                  # Tipos de documento, checklist, GRAUS_PARENTESCO, validação de arquivo
│
├── tests/
│   ├── unit/                             # Vitest — 9 suítes, 67 testes
│   │   ├── auth.test.ts
│   │   ├── clientes.test.ts
│   │   ├── idade.test.ts
│   │   ├── triagem.test.ts
│   │   ├── atividades.test.ts
│   │   ├── agenda.test.ts
│   │   ├── dashboard.test.ts
│   │   ├── alertas.test.ts
│   │   └── documentos.test.ts
│   └── db/                               # Testes de banco (psql)
│       ├── run-tests.sh                  # Aplica migrações + roda todas as suítes
│       ├── 00_auth_stub.sql              # Stub do schema auth p/ Postgres local
│       ├── 01_test_fundacao.sql
│       ├── 02_test_prisma_integracao.mjs
│       ├── 03_test_auth_provisionamento.sql
│       ├── 04_test_atividades.sql
│       ├── 05_test_agenda_funil.sql
│       ├── 06_test_documentos_pasta.sql
│       ├── 07_test_alertas_toque.sql
│       ├── 08_test_triagem.sql
│       ├── 09_test_clt_dependentes.sql
│       ├── 10_test_cpf_nascimento.sql
│       └── 11_test_certidoes_dependentes.sql
│
├── .env.example                          # Modelo das variáveis de ambiente
├── .env.local                            # Variáveis locais (fora do versionamento)
├── .gitignore
├── DNA_CRM_TECHNICAL_AUDIT.md            # Auditoria técnica da Sprint 0 (20 seções)
├── DNA_CRM_PROJECT_TREE.md               # Este arquivo
├── README.md
├── next-env.d.ts
├── next.config.ts                        # serverActions.bodySizeLimit: 12mb
├── package.json                          # Scripts: dev/build/lint/test:unit/test:db/prisma:*
├── package-lock.json
├── postcss.config.mjs
├── producao-setup.sql                    # Setup executado no Supabase de produção
└── tsconfig.json                         # TS estrito, alias @/* → src/*
```

## Observações sobre a estrutura

- **Não existem** as pastas `hooks/`, `contexts/`, `services/` nem `public/` com assets próprios: a arquitetura é server-first (sem hooks customizados nem contextos — auditoria §11/§12), a camada de "serviços" vive em `src/lib/` e não há imagens/estáticos além dos padrões do Next.
- `src/app/` usa **route groups**: `(publico)` para autenticação e `(app)` para o produto logado — os parênteses não aparecem na URL.
- Server Actions ficam em arquivos `actions*.ts` colocalizados com cada rota (não há `app/api/`).
- `supabase/migrations/` é a fonte de verdade do banco; `prisma/schema.prisma` está defasado (só espelha a 0001) — dívida técnica registrada na auditoria (§18.1).

*Documento gerado na Sprint 0, sem alteração de código. · DNA CRM · 10/07/2026*
