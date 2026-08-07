-- ==========================================================================
-- DNA CRM — Migration 0037: swe_bench_evaluations
-- Sincronização banco↔código (2026-08-07)
--
-- Motivo: a rota /swe-bench (app/swe-bench/page.tsx) e o módulo
-- src/lib/swe-bench/repository.ts consultam a tabela swe_bench_evaluations
-- (alinhado com PRD seção 3/5 e RFC 882), mas nenhuma migration anterior
-- a criava — a página quebrava em runtime com "relation does not exist".
-- Segue o padrão das demais tabelas do app (0033/0034): RLS por
-- auth.role() = 'authenticated' e grants explícitos.
-- ==========================================================================

-- ─── 1. Enum do benchmark ───
do $$ begin
  create type benchmark_tipo as enum ('verified', 'lite', 'full');
exception when duplicate_object then null; end $$;

-- ─── 2. Tabela ───
create table if not exists swe_bench_evaluations (
  id                uuid primary key default gen_random_uuid(),
  model_name        text not null,
  benchmark_type    benchmark_tipo not null,
  resolved_rate     numeric(5,2) not null check (resolved_rate >= 0 and resolved_rate <= 100),
  avg_time_seconds  numeric(12,2) not null default 0,
  total_tasks       integer not null default 0,
  pass_k            integer not null default 1 check (pass_k in (1, 10, 100)),
  date_added        timestamptz not null default now(),
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── 3. Índices usados pelas queries do repository.ts ───
create index if not exists idx_swe_bench_benchmark on swe_bench_evaluations (benchmark_type);
create index if not exists idx_swe_bench_resolved_rate on swe_bench_evaluations (resolved_rate desc);
create index if not exists idx_swe_bench_model_name on swe_bench_evaluations (model_name);
create index if not exists idx_swe_bench_date_added on swe_bench_evaluations (date_added desc);
create index if not exists idx_swe_bench_updated_at on swe_bench_evaluations (updated_at desc);

-- ─── 4. RLS ───
alter table swe_bench_evaluations enable row level security;

drop policy if exists "swe_bench_evaluations_select_auth" on swe_bench_evaluations;
create policy "swe_bench_evaluations_select_auth"
  on swe_bench_evaluations for select
  using (auth.role() = 'authenticated');

drop policy if exists "swe_bench_evaluations_insert_auth" on swe_bench_evaluations;
create policy "swe_bench_evaluations_insert_auth"
  on swe_bench_evaluations for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "swe_bench_evaluations_update_auth" on swe_bench_evaluations;
create policy "swe_bench_evaluations_update_auth"
  on swe_bench_evaluations for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── 5. Grants ───
grant select, insert, update, delete on swe_bench_evaluations to authenticated, service_role;
