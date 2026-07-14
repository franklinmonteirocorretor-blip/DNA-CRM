-- ============================================================================
-- DNA CRM — Migração 0008: Empreendimentos
-- Tabela própria para empreendimentos, substituindo o campo texto livre.
-- Adiciona FK em clientes e agendamentos para dropdown nos formulários.
-- ============================================================================

-- ── 1. Tabela empreendimentos ────────────────────────────────────────────────
create table empreendimentos (
  id                        uuid primary key default gen_random_uuid(),
  nome                      text not null,
  endereco                  text,
  vagas                     int not null default 0,
  ativo                     boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,
  constraint empreendimentos_nome_min check (length(trim(nome)) >= 2)
);

create index idx_empreendimentos_ativo on empreendimentos (ativo) where deleted_at is null;

-- ── 2. FK em clientes ────────────────────────────────────────────────────────
alter table clientes
  add column empreendimento_id uuid references empreendimentos (id);

create index idx_clientes_empreendimento on clientes (empreendimento_id)
  where deleted_at is null;

-- ── 3. FK em agendamentos ────────────────────────────────────────────────────
alter table agendamentos
  add column empreendimento_id uuid references empreendimentos (id);

create index idx_agendamentos_empreendimento on agendamentos (empreendimento_id);

-- ── 4. Trigger de updated_at ─────────────────────────────────────────────────
create or replace function set_empreendimento_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_empreendimento_updated_at
  before update on empreendimentos
  for each row execute function set_empreendimento_updated_at();

-- ── 5. RLS para empreendimentos ──────────────────────────────────────────────
alter table empreendimentos enable row level security;

-- ADMIN vê e edita tudo
create policy "admin_empreendimentos_all"
  on empreendimentos for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- GERENTE vê e edita tudo
create policy "gerente_empreendimentos_all"
  on empreendimentos for all
  using (e_gerente(auth.uid()))
  with check (e_gerente(auth.uid()));

-- CORRETOR vê apenas empreendimentos ativos
create policy "corretor_empreendimentos_select"
  on empreendimentos for select
  using (ativo = true and deleted_at is null);

-- ── 6. Função helper: get_empreendimentos_ativos() ───────────────────────────
-- Retorna todos os empreendimentos ativos (para dropdowns nos formulários).
-- Usada nos Server Components e Server Actions.
create or replace function get_empreendimentos_ativos()
returns table (
  id uuid,
  nome text,
  endereco text,
  vagas int
) language sql security definer as $$
  select id, nome, endereco, vagas
  from empreendimentos
  where ativo = true and deleted_at is null
  order by nome asc;
$$;