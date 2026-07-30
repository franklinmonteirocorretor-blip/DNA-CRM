-- ==========================================================================
-- DNA CRM — Sprint 13: Motor de Automações Comerciais (migration 0027)
-- ==========================================================================

-- ─── Tabela: automacoes (catálogo de regras SE-ENTÃO) ────────────────────
create table if not exists automacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'INATIVA' check (status in ('ATIVA','INATIVA','ERRO')),
  prioridade smallint not null default 5 check (prioridade between 1 and 10),

  -- Evento disparador
  evento text not null,                    -- ex: 'cliente_criado', 'mudanca_etapa'
  -- Condição parametrizada (JSONB para flexibilidade)
  condicoes jsonb not null default '[]',
  -- Ações a executar
  acoes jsonb not null default '[]',

  -- Responsável / auditoria
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Métricas de execução
  ultima_execucao timestamptz,
  qtd_executada integer not null default 0,
  qtd_falhas integer not null default 0,

  -- Soft delete
  deleted_at timestamptz
);

-- 2. Tabela: automacoes_log (histórico de execuções)
create table if not exists automacoes_log (
  id uuid primary key default gen_random_uuid(),
  automacao_id uuid not null references automacoes(id) on delete cascade,
  evento_disparador text not null,
  entidade_context text,          -- ex: 'cliente', 'documento'
  entidade_id uuid,               -- id do registro que disparou
  payload jsonb,                  -- dados do evento na hora do disparo
  condicoes_atendidas boolean not null default false,
  acoes_executadas jsonb,         -- [{acao, sucesso, erro?}]
  status text not null default 'PROCESSANDO' check (status in ('PROCESSANDO','SUCESSO','FALHA_PARCIAL','FALHA')),
  erro text,
  duracao_ms integer,
  criado_em timestamptz not null default now()
);

-- 3. Tabela de fila (processamento assíncrono)
create table if not exists automacoes_fila (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  payload jsonb not null,
  contexto jsonb,
  prioridade integer not null default 5,
  tentativas integer not null default 0,
  max_tentativas integer not null default 3,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','PROCESSANDO','CONCLUIDO','FALHA')),
  erro text,
  criado_em timestamptz not null default now(),
  processado_em timestamptz
);

-- 4. Índices
create index if not exists idx_automacoes_evento on automacoes(evento, status);
create index if not exists idx_automacoes_log_automacao on automacoes_log(automacao_id, criado_em desc);
create index if not exists idx_automacoes_log_entidade on automacoes_log(entidade_context, entidade_id);
create index if not exists idx_automacoes_fila_status on automacoes_fila(status, prioridade desc);
create index if not exists idx_automacoes_fila_evento on automacoes_fila(evento, status);

-- 12. Função: claim de itens da fila com row lock (race-condition safe)
create or replace function fn_automacao_claim_fila(
  p_limit integer default 20
) returns table (
  id uuid,
  evento text,
  payload jsonb,
  contexto jsonb,
  prioridade integer,
  tentativas integer,
  max_tentativas integer
)
language plpgsql security definer
as $$
begin
  return query
  update automacoes_fila
  set status = 'PROCESSANDO',
      tentativas = tentativas + 1
  where id in (
    select id
    from automacoes_fila
    where status = 'PENDENTE'
    order by prioridade desc
    limit p_limit
    for update skip locked
  )
  returning id, evento, payload, contexto, prioridade, tentativas, max_tentativas;
end;
$$;

-- 5. Função: dispatch assíncrono
create or replace function fn_automacao_dispatch(
  p_evento text,
  p_entidade text,
  p_entidade_id text,
  p_payload jsonb
) returns void
language plpgsql security definer
as $$
begin
  insert into automacoes_fila (evento, payload, contexto, prioridade, status)
  values (p_evento, p_payload, jsonb_build_object('entidade', p_entidade, 'entidade_id', p_entidade_id), 5, 'PENDENTE');
end;
$$;

-- 6. Tabela: automacao_tarefas (tarefas e alertas gerados pelo motor)
create table if not exists automacao_tarefas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('TAREFA','ALERTA')),
  titulo text not null,
  descricao text,
  entidade text not null,
  entidade_id uuid not null,
  responsavel_id uuid references usuarios(id),
  status text not null default 'PENDENTE' check (status in ('PENDENTE','CONCLUIDO','CANCELADO')),
  prioridade smallint not null default 2 check (prioridade between 1 and 3),
  prazo_em timestamptz,
  origem text not null default 'automacao',
  dados jsonb,
  concluido_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 7. Função: registrar auditoria automática (bypass RLS)
create or replace function registrar_auditoria_auto(
  p_entidade text,
  p_entidade_id text,
  p_acao text,
  p_observacao text default null,
  p_dados_novos jsonb default null
) returns void
language plpgsql security definer
as $$
begin
  insert into historico_acoes (entidade, entidade_id, acao, dados_novos, observacao)
  values (p_entidade, p_entidade_id::uuid, p_acao::tipo_historico_acao, p_dados_novos, p_observacao);
end;
$$;

-- 8. RLS policies
alter table automacoes enable row level security;
alter table automacoes_log enable row level security;
alter table automacoes_fila enable row level security;

create policy automacoes_admin_gerente on automacoes for all using (is_admin() or is_gerente());
create policy automacoes_log_admin_gerente on automacoes_log for all using (is_admin() or is_gerente());
create policy automacoes_fila_admin_gerente on automacoes_fila for all using (is_admin() or is_gerente());

-- 9. Ajuste historico_acoes: permitir usuario_id nulo
alter table historico_acoes alter column usuario_id drop not null;

-- 10. Índices extras
create index if not exists idx_automacao_tarefas_entidade on automacao_tarefas(entidade, entidade_id);
create index idx_automacao_tarefas_status on automacao_tarefas(status);

-- 11. RLS para automacao_tarefas
alter table automacao_tarefas enable row level security;
create policy automacao_tarefas_admin_gerente on automacao_tarefas for all using (is_admin() or is_gerente());