-- ==========================================================================
-- DNA CRM — Sprint 16: Copiloto IA — Memória (migration 0034)
-- Tabela copiloto_memoria: registra perguntas, recomendações aceitas/ignoradas,
-- comandos executados e feedback do corretor.
-- ==========================================================================

create table copiloto_memoria (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references usuarios (id),
  tipo            text not null
                  check (tipo in ('pergunta', 'recomendacao_aceita', 'recomendacao_ignorada', 'comando_executado', 'insight_visualizado', 'erro')),
  pergunta        text,                       -- texto da pergunta do usuário
  resposta        text,                        -- resposta gerada (ou sumário)
  contexto_dados  jsonb,                       -- snapshot dos dados usados na resposta
  acao            text,                         -- ação executada (se tipo = comando_executado)
  origem          text,                        -- 'secao_resumo', 'secao_perguntas', 'secao_recomendacoes', 'secao_comandos'
  util            boolean,                     -- usuário marcou como útil
  created_at      timestamptz not null default now()
);

-- Índices
create index idx_copiloto_memoria_usuario
  on copiloto_memoria (usuario_id, created_at desc);
create index idx_copiloto_memoria_tipo
  on copiloto_memoria (usuario_id, tipo, created_at desc);

-- RLS
alter table copiloto_memoria enable row level security;

create policy "copiloto_memoria_select_owner"
  on copiloto_memoria for select
  using (auth.uid() = usuario_id);

create policy "copiloto_memoria_insert_owner"
  on copiloto_memoria for insert
  with check (auth.uid() = usuario_id);

-- Não tem Realtime — a memória é consultada sob demanda
-- Sem triggers — inserida pelo backend via server actions