-- ==========================================================================
-- DNA CRM — Migration 0035: Hardening RLS + Schema de Automação
-- Sprint 18 (correções de segurança no banco)
--
-- Corrige 4 riscos confirmados dinamicamente contra o banco real:
--   R1 (CRÍTICO) auto-promoção: corretor PATCH a própria linha e muda perfil
--   R2 (ALTA)     IDOR agendamentos: corretor agenda/atualiza em cliente de outro
--   R3 (MÉDIA)    SELECT usuarios: qualquer autenticado lê todos os usuários
--   R4 (MÉDIA)    Automação: tabelas automacoes*/funções fn_automacao* não existem
-- Bônus (R5, CRÍTICO) escalada via INSERT: usuário cria a própria linha com perfil livre
-- ==========================================================================

-- ─── 1. Enum perfil_usuario: adiciona SUPERVISOR (o código já o usa) ─────────
alter type public.perfil_usuario add value if not exists 'SUPERVISOR';

-- ─── 2. Funções de autorização ───────────────────────────────────────────────

-- is_gerente: usuário logado com perfil GERENTE (não deletado)
create or replace function public.is_gerente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and perfil = 'GERENTE'
      and deleted_at is null
  );
$$;

-- is_supervisor: usuário logado com perfil SUPERVISOR (não deletado)
create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and perfil = 'SUPERVISOR'
      and deleted_at is null
  );
$$;

-- e_dono_do_cliente: true se o usuário é admin, corretor responsável pelo
-- cliente, ou gerente do corretor responsável. Base de todas as regras
-- de propriedade de cliente (bloqueia IDOR entre corretores).
create or replace function public.e_dono_do_cliente(p_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clientes c
    where c.id = p_cliente_id
      and (
        public.is_admin()
        or c.corretor_responsavel_id = auth.uid()
        or public.e_gerente_de(c.corretor_responsavel_id)
      )
  );
$$;

-- ─── 3. RLS usuarios (R1, R3 e R5) ───────────────────────────────────────────

-- R3: corretor vê apenas a própria linha; admin/gerente/supervisor veem todos
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (
    public.is_admin() or public.is_gerente() or public.is_supervisor()
    or id = auth.uid()
  );

-- R1: corretor não pode mudar o PRÓPRIO perfil (só admin pode)
drop policy if exists usuarios_update_self on public.usuarios;
create policy usuarios_update_self on public.usuarios
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      id = auth.uid()
      and perfil = (select u.perfil from public.usuarios u where u.id = auth.uid())
    )
  );

-- R5: auto-registro apenas como CORRETOR; admin cria qualquer perfil
drop policy if exists usuarios_admin_all on public.usuarios;
create policy usuarios_admin_all on public.usuarios
  for insert to authenticated
  with check (
    public.is_admin()
    or (id = auth.uid() and perfil = 'CORRETOR')
  );

-- ─── 4. RLS agendamentos (R2) ────────────────────────────────────────────────

-- INSERT: corretor só agenda em cliente do qual é dono (ou gerente do dono)
drop policy if exists agendamentos_write on public.agendamentos;
create policy agendamentos_write on public.agendamentos
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.e_dono_do_cliente(cliente_id)
      and (corretor_id = auth.uid() or public.e_gerente_de(corretor_id))
    )
  );

-- UPDATE: mesmo vínculo no WITH CHECK — impede mover/transferir agendamento
-- para cliente ou corretor fora da propriedade do usuário
drop policy if exists agendamentos_update on public.agendamentos;
create policy agendamentos_update on public.agendamentos
  for update to authenticated
  using (
    public.is_admin() or corretor_id = auth.uid() or public.e_gerente_de(corretor_id)
  )
  with check (
    public.is_admin()
    or (
      public.e_dono_do_cliente(cliente_id)
      and (corretor_id = auth.uid() or public.e_gerente_de(corretor_id))
    )
  );

-- ─── 5. Schema de automação (R4) ─────────────────────────────────────────────

-- Regras de automação (contrato: engine.ts + app/dashboard/automacoes/actions.ts)
create table if not exists public.automacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  status text not null default 'ATIVA',
  evento text not null,
  condicoes jsonb not null default '[]'::jsonb,
  acoes jsonb not null default '[]'::jsonb,
  prioridade integer not null default 5,
  ultima_execucao timestamptz,
  qtd_executada integer not null default 0,
  qtd_falhas integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  constraint automacoes_status_check check (status in ('ATIVA', 'INATIVA', 'ERRO'))
);

-- Fila de eventos (contrato: engine.ts dispatch/claim)
create table if not exists public.automacoes_fila (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  entidade text,
  entidade_id uuid,
  payload jsonb not null default '{}'::jsonb,
  contexto jsonb,
  prioridade integer not null default 5,
  status text not null default 'PENDENTE',
  tentativas integer not null default 0,
  max_tentativas integer not null default 3,
  erro text,
  processado_em timestamptz,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint automacoes_fila_status_check check (
    status in ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'FALHA')
  )
);

-- Histórico de execuções (contrato: engine.ts processarEvento)
create table if not exists public.automacoes_log (
  id uuid primary key default gen_random_uuid(),
  automacao_id uuid references public.automacoes(id) on delete cascade,
  evento_disparador text,
  entidade_contexto text,
  entidade_id uuid,
  payload jsonb,
  condicoes_atendidas boolean not null default false,
  acoes_executadas jsonb not null default '[]'::jsonb,
  status text not null default 'PROCESSANDO',
  erro text,
  duracao_ms integer,
  criado_em timestamptz not null default now(),
  constraint automacoes_log_status_check check (
    status in ('PROCESSANDO', 'SUCESSO', 'FALHA_PARCIAL', 'FALHA')
  )
);

-- Índices de acesso
create index if not exists automacoes_evento_status_idx on public.automacoes (evento, status);
create index if not exists automacoes_prioridade_idx on public.automacoes (prioridade desc);
create index if not exists automacoes_fila_status_prio_idx on public.automacoes_fila (status, prioridade desc, criado_em);
create index if not exists automacoes_log_automacao_idx on public.automacoes_log (automacao_id, criado_em desc);

-- RLS (feature exclusiva de admin/gerente; cron usa service_role = BYPASSRLS)
alter table public.automacoes enable row level security;
alter table public.automacoes_fila enable row level security;
alter table public.automacoes_log enable row level security;

drop policy if exists automacoes_crud on public.automacoes;
create policy automacoes_crud on public.automacoes
  for all to authenticated
  using (public.is_admin() or public.is_gerente())
  with check (public.is_admin() or public.is_gerente());

drop policy if exists automacoes_fila_select on public.automacoes_fila;
create policy automacoes_fila_select on public.automacoes_fila
  for select to authenticated
  using (public.is_admin() or public.is_gerente());

drop policy if exists automacoes_fila_update on public.automacoes_fila;
create policy automacoes_fila_update on public.automacoes_fila
  for update to authenticated
  using (public.is_admin() or public.is_gerente())
  with check (public.is_admin() or public.is_gerente());

drop policy if exists automacoes_log_crud on public.automacoes_log;
create policy automacoes_log_crud on public.automacoes_log
  for all to authenticated
  using (public.is_admin() or public.is_gerente())
  with check (public.is_admin() or public.is_gerente());

-- Trigger de updated_at (a coluna em automacoes é `atualizado_em`,
-- então usamos função dedicada — trg_fn_set_updated_at espera `updated_at`)
create or replace function public.trg_fn_set_atualizado_em()
returns trigger
language plpgsql
as $fn$
begin
  new.atualizado_em = now();
  return new;
end;
$fn$;

drop trigger if exists set_updated_at on public.automacoes;
create trigger set_updated_at before update on public.automacoes
  for each row execute function public.trg_fn_set_atualizado_em();

-- ─── 6. Funções RPC de automação ─────────────────────────────────────────────

-- fn_automacao_dispatch: enfileira um evento (chamada pelo engine.ts)
create or replace function public.fn_automacao_dispatch(
  p_evento text,
  p_entidade text,
  p_entidade_id uuid,
  p_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
begin
  insert into public.automacoes_fila (evento, entidade, entidade_id, payload, contexto, criado_por)
  values (
    p_evento,
    p_entidade,
    p_entidade_id,
    coalesce(
      p_payload,
      jsonb_build_object(
        'evento', p_evento,
        'entidade', p_entidade,
        'entidade_id', p_entidade_id,
        'timestamp', now()
      )
    ),
    null,
    v_usuario
  );
end;
$$;

-- fn_automacao_claim_fila: claim atômico de itens PENDENTES (row lock).
-- Somente admin/gerente (REST autenticado) ou service_role (cron) podem chamar.
create or replace function public.fn_automacao_claim_fila(p_limit integer default 50)
returns table (
  id uuid,
  evento text,
  entidade text,
  entidade_id uuid,
  payload jsonb,
  contexto jsonb,
  prioridade integer,
  status text,
  tentativas integer,
  max_tentativas integer,
  erro text,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (auth.uid() is not null and not (public.is_admin() or public.is_gerente())) then
    raise exception 'Acesso negado à fila de automações';
  end if;

  return query
  with atualizados as (
    update public.automacoes_fila af
    set status = 'PROCESSANDO',
        tentativas = af.tentativas + 1,
        erro = null
    where af.id in (
      select f.id
      from public.automacoes_fila f
      where f.status = 'PENDENTE'
      order by f.prioridade desc, f.criado_em asc
      limit p_limit
      for update skip locked
    )
    returning af.*
  )
  select a.id, a.evento, a.entidade, a.entidade_id, a.payload, a.contexto,
         a.prioridade, a.status, a.tentativas, a.max_tentativas, a.erro, a.criado_em
  from atualizados a;
end;
$$;

-- ─── 7. Permissões (default_acl já concede; aqui garantimos e fechamos o anon) ─
grant select, insert, update, delete on public.automacoes to authenticated, service_role;
grant select, insert, update, delete on public.automacoes_fila to authenticated, service_role;
grant select, insert, update, delete on public.automacoes_log to authenticated, service_role;

grant execute on function public.fn_automacao_dispatch(text, text, uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_automacao_claim_fila(integer) to authenticated, service_role;

revoke execute on function public.fn_automacao_dispatch(text, text, uuid, jsonb) from anon, public;
revoke execute on function public.fn_automacao_claim_fila(integer) from anon, public;
