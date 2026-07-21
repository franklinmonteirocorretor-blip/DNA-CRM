-- ==========================================================================
-- DNA CRM — RESET COMPLETO DE PRODUÇÃO (DROP + RECREATE)
-- Migrações 0000-0019 consolidadas com correções inline
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)
-- Gerado: 2026-07-15
-- ==========================================================================

-- ==========================================================================
-- PREÂMBULO: DROP & RECREATE SCHEMA PUBLIC
-- ATENÇÃO: Isto apaga TODAS as tabelas, funções, políticas, enums e dados.
-- ==========================================================================
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ==========================================================================
-- 0000 — FUNDAÇÃO (0001_fundacao + 0002_auth + 0003_auditoria_timeline +
--         0004_hardening + 0005_agenda_funil + 0007_alertas + storage)
-- NOTA: fn_pasta_completa e trigger documento_pasta vão na seção 0014-0016.
-- ==========================================================================

-- ── Extensões ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type perfil_usuario as enum ('CORRETOR','GERENTE','ADMINISTRADOR');

create type etapa_funil as enum (
  'NOVO_LEAD','CONTATOS','AGENDAMENTO','COMPARECIMENTO','ANALISE',
  'RESTRICOES','CONDICIONADOS','APROVADOS','FECHAMENTOS','POS_VENDA'
);

create type resultado_analise as enum ('RESTRICAO','CONDICIONADO','APROVADO','DOC_PENDENTE');

create type tipo_atividade as enum ('LIGACAO','WHATSAPP','FOLLOW_UP');

create type status_agendamento as enum ('AGENDADO','CONFIRMADO','REMARCADO','CANCELADO');

create type resultado_comparecimento as enum ('COMPARECEU','NAO_COMPARECEU');

create type tipo_documento as enum (
  'RG','CPF','CNH','COMPROVANTE_RENDA','FGTS','CONTRATO','PROPOSTA_PDF','OUTRO'
);

create type status_validacao_doc as enum ('PENDENTE','VALIDADO','REJEITADO');

create type acao_auditoria as enum ('CRIACAO','ATUALIZACAO','EXCLUSAO','MUDANCA_ETAPA');

-- ── Tabelas ─────────────────────────────────────────────────────────────────

-- usuarios: estende auth.users do Supabase (não guarda senha)
create table usuarios (
  id          uuid primary key references auth.users (id),
  nome        text not null,
  email       text not null unique,
  telefone    text,
  perfil      perfil_usuario not null default 'CORRETOR',
  gerente_id  uuid references usuarios (id),
  avatar_url  text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint usuarios_nao_gerente_de_si check (gerente_id is null or gerente_id <> id)
);
create index idx_usuarios_gerente on usuarios (gerente_id);
create index idx_usuarios_perfil on usuarios (perfil);

-- clientes: núcleo do sistema.
create table clientes (
  id                        uuid primary key default gen_random_uuid(),
  nome                      text not null,
  cpf                       text not null unique,
  telefone                  text not null,
  email                     text,
  renda                     numeric(12,2),
  dependentes               int not null default 0,
  tempo_clt_meses           int,
  saldo_fgts                numeric(12,2) not null default 0,
  eh_casado                 boolean not null default false,
  etapa_atual               etapa_funil not null default 'NOVO_LEAD',
  resultado_analise         resultado_analise,
  ficha_proposta_assinada   boolean not null default false,
  data_fechamento           timestamptz,
  imovel_entregue_em        timestamptz,
  corretor_responsavel_id   uuid not null references usuarios (id),
  empreendimento_interesse  text,
  proxima_acao              text,
  proxima_acao_em           timestamptz,
  observacoes               text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,
  constraint clientes_cpf_valido        check (cpf is null or cpf ~ '^\d{11}$'),
  constraint clientes_renda_positiva    check (renda is null or renda >= 0),
  constraint clientes_dependentes_pos   check (dependentes >= 0),
  constraint clientes_clt_positivo      check (tempo_clt_meses is null or tempo_clt_meses >= 0)
);
create index idx_clientes_pipeline on clientes (corretor_responsavel_id, etapa_atual)
  where deleted_at is null;
create index idx_clientes_busca_trgm on clientes using gin (nome gin_trgm_ops);

-- conjuges: 1:1 opcional com clientes, criado automaticamente por trigger.
create table conjuges (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null unique references clientes (id),
  nome            text not null default '',
  cpf             text,
  renda           numeric(12,2),
  tempo_clt_meses int,
  saldo_fgts      numeric(12,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint conjuges_renda_positiva check (renda is null or renda >= 0)
);

-- atividades: evento imutável, maior volume de escrita do sistema
create table atividades (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id),
  usuario_id  uuid not null references usuarios (id),
  tipo        tipo_atividade not null,
  resultado   text,
  observacao  text,
  created_at  timestamptz not null default now()
);
create index idx_atividades_usuario_data on atividades (usuario_id, created_at);
create index idx_atividades_cliente_data on atividades (cliente_id, created_at);
create index idx_atividades_created_brin on atividades using brin (created_at);

-- agendamentos
create table agendamentos (
  id                        uuid primary key default gen_random_uuid(),
  cliente_id                uuid not null references clientes (id),
  corretor_id               uuid not null references usuarios (id),
  empreendimento_interesse  text,
  data_hora                 timestamptz not null,
  status                    status_agendamento not null default 'AGENDADO',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index idx_agendamentos_corretor_data on agendamentos (corretor_id, data_hora);
create index idx_agendamentos_cliente on agendamentos (cliente_id);

-- comparecimentos: 1:1 com agendamentos
create table comparecimentos (
  id              uuid primary key default gen_random_uuid(),
  agendamento_id  uuid not null unique references agendamentos (id),
  resultado       resultado_comparecimento not null,
  motivo_ausencia text,
  observacao      text,
  created_at      timestamptz not null default now()
);

-- documentos
create table documentos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes (id),
  tipo              tipo_documento not null,
  arquivo_url       text not null,
  status_validacao  status_validacao_doc not null default 'PENDENTE',
  enviado_por       uuid not null references usuarios (id),
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index idx_documentos_cliente_tipo on documentos (cliente_id, tipo);

-- producao_diaria: agregação automática — NUNCA escrita pela aplicação
create table producao_diaria (
  id                     uuid primary key default gen_random_uuid(),
  usuario_id             uuid not null references usuarios (id),
  data                   date not null,
  ligacoes               int not null default 0,
  whatsapp               int not null default 0,
  follow_ups             int not null default 0,
  agendamentos           int not null default 0,
  comparecimentos        int not null default 0,
  pastas                 int not null default 0,
  comparecimentos_feirao int not null default 0,
  aprovacoes             int not null default 0,
  vendas                 int not null default 0,
  pontuacao_gamificacao  numeric(10,2) generated always as (
    ligacoes * 1 + whatsapp * 0.5 + agendamentos * 10 + comparecimentos * 20
    + pastas * 40 + aprovacoes * 80 + vendas * 160
  ) stored,
  unique (usuario_id, data)
);
create index idx_producao_data on producao_diaria (data);

-- historico_acoes: auditoria (Master Skill) — bigserial, só cresce
create table historico_acoes (
  id                bigserial primary key,
  usuario_id        uuid references usuarios (id),
  entidade          text not null,
  entidade_id       uuid not null,
  acao              acao_auditoria not null,
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  observacao        text,
  created_at        timestamptz not null default now()
);
create index idx_historico_entidade on historico_acoes (entidade, entidade_id, created_at);
create index idx_historico_created_brin on historico_acoes using brin (created_at);

-- ── Triggers ────────────────────────────────────────────────────────────────

-- 6.6 updated_at automático
create or replace function trg_fn_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger set_updated_at before update on usuarios
  for each row execute function trg_fn_set_updated_at();
create trigger set_updated_at before update on clientes
  for each row execute function trg_fn_set_updated_at();
create trigger set_updated_at before update on conjuges
  for each row execute function trg_fn_set_updated_at();
create trigger set_updated_at before update on agendamentos
  for each row execute function trg_fn_set_updated_at();

-- 6.1 Fechamento automático: Ficha Proposta assinada => etapa FECHAMENTOS
create or replace function trg_fn_cliente_fechamento() returns trigger
language plpgsql as $$
begin
  if new.ficha_proposta_assinada = true and old.ficha_proposta_assinada = false then
    new.etapa_atual := 'FECHAMENTOS';
    new.data_fechamento := now();
  end if;
  return new;
end $$;

create trigger cliente_fechamento before update on clientes
  for each row execute function trg_fn_cliente_fechamento();

-- 6.2 Cônjuge criado automaticamente quando eh_casado vira true
create or replace function trg_fn_criar_conjuge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.eh_casado = true and (tg_op = 'INSERT' or old.eh_casado = false) then
    insert into conjuges (cliente_id) values (new.id)
    on conflict (cliente_id) do nothing;
  end if;
  return new;
end $$;

create trigger cliente_criar_conjuge after insert or update on clientes
  for each row execute function trg_fn_criar_conjuge();

-- 6.5 Produção diária agregada automaticamente
create or replace function fn_upsert_producao(p_usuario uuid, p_coluna text) returns void
language plpgsql security definer set search_path = public as $$
begin
  execute format(
    'insert into producao_diaria (usuario_id, data, %1$I) values ($1, current_date, 1)
     on conflict (usuario_id, data) do update set %1$I = producao_diaria.%1$I + 1',
    p_coluna
  ) using p_usuario;
end $$;

create or replace function trg_fn_atividade_producao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform fn_upsert_producao(
    new.usuario_id,
    case new.tipo
      when 'LIGACAO'  then 'ligacoes'
      when 'WHATSAPP' then 'whatsapp'
      else 'follow_ups'
    end
  );
  return new;
end $$;

create trigger atividade_producao after insert on atividades
  for each row execute function trg_fn_atividade_producao();

create or replace function trg_fn_agendamento_producao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform fn_upsert_producao(new.corretor_id, 'agendamentos');
  return new;
end $$;

create trigger agendamento_producao after insert on agendamentos
  for each row execute function trg_fn_agendamento_producao();

-- Comparecimento só conta na produção quando o cliente COMPARECEU
create or replace function trg_fn_comparecimento_producao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_corretor uuid;
begin
  if new.resultado = 'COMPARECEU' then
    select corretor_id into v_corretor from agendamentos where id = new.agendamento_id;
    perform fn_upsert_producao(v_corretor, 'comparecimentos');
  end if;
  return new;
end $$;

create trigger comparecimento_producao after insert on comparecimentos
  for each row execute function trg_fn_comparecimento_producao();

-- 6.7 Auditoria automática
create or replace function trg_fn_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into historico_acoes (usuario_id, entidade, entidade_id, acao,
                                dados_anteriores, dados_novos)
  values (
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    tg_table_name,
    coalesce(new.id, old.id),
    case tg_op
      when 'INSERT' then 'CRIACAO'::acao_auditoria
      when 'DELETE' then 'EXCLUSAO'::acao_auditoria
      else 'ATUALIZACAO'::acao_auditoria
    end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger auditoria after insert or update or delete on agendamentos
  for each row execute function trg_fn_auditoria();
create trigger auditoria after insert or update or delete on documentos
  for each row execute function trg_fn_auditoria();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Funções SECURITY DEFINER para evitar recursão de RLS sobre usuarios.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid() and perfil = 'ADMINISTRADOR' and deleted_at is null
  );
$$;

create or replace function e_gerente_de(p_corretor_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where id = p_corretor_id and gerente_id = auth.uid() and deleted_at is null
  );
$$;

-- usuarios: todos autenticados leem; cada um edita o próprio perfil; admin gerencia tudo.
alter table usuarios enable row level security;
create policy usuarios_select on usuarios for select
  using (auth.uid() is not null);
create policy usuarios_update_self on usuarios for update
  using (id = auth.uid() or is_admin());
create policy usuarios_admin_all on usuarios for insert
  with check (is_admin() or id = auth.uid());

-- clientes
alter table clientes enable row level security;
create policy clientes_select on clientes for select using (
  is_admin() or corretor_responsavel_id = auth.uid()
  or e_gerente_de(corretor_responsavel_id)
);
create policy clientes_insert on clientes for insert with check (
  is_admin() or corretor_responsavel_id = auth.uid()
  or e_gerente_de(corretor_responsavel_id)
);
create policy clientes_update on clientes for update using (
  is_admin() or corretor_responsavel_id = auth.uid()
  or e_gerente_de(corretor_responsavel_id)
);

-- conjuges: segue a permissão do cliente dono
alter table conjuges enable row level security;
create policy conjuges_all on conjuges for all using (
  exists (
    select 1 from clientes c
    where c.id = conjuges.cliente_id
      and (is_admin() or c.corretor_responsavel_id = auth.uid()
           or e_gerente_de(c.corretor_responsavel_id))
  )
);

-- atividades: dono registra as suas; gerente/admin leem as da equipe
alter table atividades enable row level security;
create policy atividades_select on atividades for select using (
  is_admin() or usuario_id = auth.uid() or e_gerente_de(usuario_id)
);
create policy atividades_insert on atividades for insert with check (
  usuario_id = auth.uid()
);

-- agendamentos
alter table agendamentos enable row level security;
create policy agendamentos_select on agendamentos for select using (
  is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id)
);
create policy agendamentos_write on agendamentos for insert with check (
  is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id)
);
create policy agendamentos_update on agendamentos for update using (
  is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id)
);

-- comparecimentos: segue a permissão do agendamento
alter table comparecimentos enable row level security;
create policy comparecimentos_all on comparecimentos for all using (
  exists (
    select 1 from agendamentos a
    where a.id = comparecimentos.agendamento_id
      and (is_admin() or a.corretor_id = auth.uid() or e_gerente_de(a.corretor_id))
  )
);

-- documentos: segue a permissão do cliente
alter table documentos enable row level security;
create policy documentos_all on documentos for all using (
  exists (
    select 1 from clientes c
    where c.id = documentos.cliente_id
      and (is_admin() or c.corretor_responsavel_id = auth.uid()
           or e_gerente_de(c.corretor_responsavel_id))
  )
);

-- producao_diaria: leitura própria/equipe/admin. SEM política de escrita.
alter table producao_diaria enable row level security;
create policy producao_select on producao_diaria for select using (
  is_admin() or usuario_id = auth.uid() or e_gerente_de(usuario_id)
);

-- historico_acoes: leitura gerente/admin. SEM política de escrita.
alter table historico_acoes enable row level security;
create policy historico_select on historico_acoes for select using (
  is_admin() or usuario_id = auth.uid() or e_gerente_de(usuario_id)
);

-- ── 0002: Auto-provisionamento de usuários ───────────────────────────────────
create or replace function public.handle_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.usuarios (id, nome, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- ── 0003: Correção de auditoria + timeline ───────────────────────────────────
create or replace function trg_fn_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into historico_acoes (usuario_id, entidade, entidade_id, acao,
                                dados_anteriores, dados_novos)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    case tg_op
      when 'INSERT' then 'CRIACAO'::acao_auditoria
      when 'DELETE' then 'EXCLUSAO'::acao_auditoria
      else 'ATUALIZACAO'::acao_auditoria
    end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create or replace function trg_fn_auditoria_clientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into historico_acoes (usuario_id, entidade, entidade_id, acao,
                                dados_anteriores, dados_novos)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'INSERT' then 'CRIACAO'::acao_auditoria
      when tg_op = 'DELETE' then 'EXCLUSAO'::acao_auditoria
      when new.etapa_atual is distinct from old.etapa_atual
        then 'MUDANCA_ETAPA'::acao_auditoria
      else 'ATUALIZACAO'::acao_auditoria
    end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger auditoria after insert or update or delete on clientes
  for each row execute function trg_fn_auditoria_clientes();

-- Timeline: quem pode ver o cliente pode ver o histórico do cliente
create policy historico_select_por_cliente on historico_acoes for select using (
  entidade = 'clientes' and exists (
    select 1 from clientes c
    where c.id = historico_acoes.entidade_id
      and (is_admin() or c.corretor_responsavel_id = auth.uid()
           or e_gerente_de(c.corretor_responsavel_id))
  )
);

-- ── 0004: Endurecimento de RLS de atividades ─────────────────────────────────
drop policy atividades_insert on atividades;

create policy atividades_insert on atividades for insert with check (
  usuario_id = auth.uid()
  and exists (
    select 1 from clientes c
    where c.id = atividades.cliente_id
      and (is_admin() or c.corretor_responsavel_id = auth.uid()
           or e_gerente_de(c.corretor_responsavel_id))
  )
);

-- ── 0005: Sincronização automática agenda ↔ funil ────────────────────────────
create or replace function trg_fn_agendamento_funil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clientes
     set etapa_atual = 'AGENDAMENTO'
   where id = new.cliente_id
     and etapa_atual in ('NOVO_LEAD','CONTATOS');
  return new;
end $$;

create trigger agendamento_sincroniza_funil after insert on agendamentos
  for each row execute function trg_fn_agendamento_funil();

create or replace function trg_fn_comparecimento_funil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.resultado = 'COMPARECEU' then
    update clientes c
       set etapa_atual = 'COMPARECIMENTO'
      from agendamentos a
     where a.id = new.agendamento_id
       and c.id = a.cliente_id
       and c.etapa_atual in ('NOVO_LEAD','CONTATOS','AGENDAMENTO');
  end if;
  return new;
end $$;

create trigger comparecimento_sincroniza_funil after insert on comparecimentos
  for each row execute function trg_fn_comparecimento_funil();

-- ── 0007: Base dos alertas + auditoria sem ruído ─────────────────────────────
alter table clientes add column ultima_atividade_em timestamptz not null default now();

create index idx_clientes_ultima_atividade
  on clientes (corretor_responsavel_id, ultima_atividade_em)
  where deleted_at is null;

create or replace function trg_fn_toque_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clientes set ultima_atividade_em = now() where id = new.cliente_id;
  return new;
end $$;

create trigger atividade_toque after insert on atividades
  for each row execute function trg_fn_toque_cliente();
create trigger agendamento_toque after insert on agendamentos
  for each row execute function trg_fn_toque_cliente();

create or replace function trg_fn_toque_cliente_via_agendamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clientes c set ultima_atividade_em = now()
    from agendamentos a
   where a.id = new.agendamento_id and c.id = a.cliente_id;
  return new;
end $$;

create trigger comparecimento_toque after insert on comparecimentos
  for each row execute function trg_fn_toque_cliente_via_agendamento();

-- Auditoria de clientes ignora updates de "toque"
create or replace function trg_fn_auditoria_clientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(old) - 'ultima_atividade_em' - 'updated_at')
       = (to_jsonb(new) - 'ultima_atividade_em' - 'updated_at') then
    return new;
  end if;

  insert into historico_acoes (usuario_id, entidade, entidade_id, acao,
                                dados_anteriores, dados_novos)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'INSERT' then 'CRIACAO'::acao_auditoria
      when tg_op = 'DELETE' then 'EXCLUSAO'::acao_auditoria
      when new.etapa_atual is distinct from old.etapa_atual
        then 'MUDANCA_ETAPA'::acao_auditoria
      else 'ATUALIZACAO'::acao_auditoria
    end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- ── Storage: bucket de documentos ────────────────────────────────────────────
-- Dropa politicas antigas (bucket pode ter sobrevivido ao DROP SCHEMA)
drop policy if exists "documentos_upload" on storage.objects;
drop policy if exists "documentos_leitura" on storage.objects;

insert into storage.buckets (id, name, public)
values ('documentos','documentos', false)
on conflict (id) do nothing;

create policy "documentos_upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'documentos');

create policy "documentos_leitura" on storage.objects for select
  to authenticated using (bucket_id = 'documentos');
-- ==========================================================================
-- 0008 — EMPREENDIMENTOS
-- ==========================================================================

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

alter table clientes
  add column empreendimento_id uuid references empreendimentos (id);

create index idx_clientes_empreendimento on clientes (empreendimento_id)
  where deleted_at is null;

alter table agendamentos
  add column empreendimento_id uuid references empreendimentos (id);

create index idx_agendamentos_empreendimento on agendamentos (empreendimento_id);

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

-- ── CORRECAO 1: Overloads is_admin(p_uid) e e_gerente_de(p_uid) ─────────────
-- As politicas RLS de 0008 usam is_admin(auth.uid()) e e_gerente(auth.uid()),
-- mas as funcoes definidas em 0000 sao is_admin() (sem args) e
-- e_gerente_de(p_corretor_id uuid) (1 arg). Criamos overload para is_admin,
-- e para e_gerente_de simplesmente usamos a funcao existente (o parametro
-- p_corretor_id ja recebe auth.uid() normalmente).

-- Overload de is_admin que aceita parametro (usado nas politicas do 0008)
create or replace function is_admin(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from usuarios
    where id = p_uid and perfil = 'ADMINISTRADOR' and deleted_at is null
  );
$$;

-- NOTA: e_gerente_de(p_corretor_id uuid) ja existe desde a 0000 e aceita
-- auth.uid() como argumento. As politicas do 0008 chamam e_gerente_de(auth.uid())
-- que funciona perfeitamente com a funcao original.

-- ── RLS para empreendimentos ─────────────────────────────────────────────────
alter table empreendimentos enable row level security;

create policy "admin_empreendimentos_all"
  on empreendimentos for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "gerente_empreendimentos_all"
  on empreendimentos for all
  using (e_gerente_de(auth.uid()))
  with check (e_gerente_de(auth.uid()));

create policy "corretor_empreendimentos_select"
  on empreendimentos for select
  using (ativo = true and deleted_at is null);

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

-- ==========================================================================
-- 0009 — VGV E COMISSOES
-- ==========================================================================

alter table clientes
  add column vgv                   numeric(12,2),
  add column comissao_percentual   numeric(5,2),
  add column comissao_valor        numeric(12,2);

alter table clientes
  add constraint clientes_vgv_positivo      check (vgv is null or vgv >= 0),
  add constraint clientes_comissao_pct_val  check (comissao_percentual is null or (comissao_percentual >= 0 and comissao_percentual <= 100)),
  add constraint clientes_comissao_positiva check (comissao_valor is null or comissao_valor >= 0);

create or replace function fn_calcular_comissao()
returns trigger as $$
begin
  if new.vgv is not null and new.comissao_percentual is not null
     and new.comissao_valor is null then
    new.comissao_valor := round((new.vgv * new.comissao_percentual / 100)::numeric, 2);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_calcular_comissao
  before insert or update on clientes
  for each row execute function fn_calcular_comissao();

create or replace function get_ranking_vgv(
  p_data_inicio date,
  p_data_fim    date
)
returns table (
  corretor_id    uuid,
  corretor_nome  text,
  vgv_total      numeric,
  comissao_total numeric,
  fechamentos    bigint
) language sql security definer as $$
  select
    c.corretor_responsavel_id,
    u.nome,
    coalesce(sum(c.vgv), 0)::numeric(12,2) as vgv_total,
    coalesce(sum(c.comissao_valor), 0)::numeric(12,2) as comissao_total,
    count(*) as fechamentos
  from clientes c
  join usuarios u on u.id = c.corretor_responsavel_id
  where c.data_fechamento >= p_data_inicio
    and c.data_fechamento <= p_data_fim
    and c.ficha_proposta_assinada = true
    and c.deleted_at is null
  group by c.corretor_responsavel_id, u.nome
  order by vgv_total desc;
$$;

-- ==========================================================================
-- 0010 — NOTIFICACOES
-- ==========================================================================

create type tipo_notificacao as enum (
  'CLIENTE_PARADO',
  'AGENDAMENTO_HOJE',
  'AGENDAMENTO_AMANHA',
  'DOCUMENTO_PENDENTE',
  'POS_VENDA_PRAZO',
  'FECHAMENTO_REALIZADO',
  'ANALISE_CONCLUIDA'
);

create table notificacoes (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuarios (id),
  tipo          tipo_notificacao not null,
  titulo        text not null,
  mensagem      text not null,
  link          text,
  lida          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_notificacoes_usuario_lida on notificacoes (usuario_id, lida, created_at desc);

alter table notificacoes enable row level security;

create policy "notificacoes_select_owner"
  on notificacoes for select
  using (auth.uid() = usuario_id);

create policy "notificacoes_update_owner"
  on notificacoes for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "notificacoes_insert_system"
  on notificacoes for insert
  with check (true);

alter publication supabase_realtime add table notificacoes;

create or replace function gerar_notificacoes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  corretor record;
  notif_count int;
begin
  delete from notificacoes
  where lida = false
    and created_at < now() - interval '7 days';

  for corretor in
    select id, nome from usuarios
    where perfil = 'CORRETOR' and ativo = true and deleted_at is null
  loop
    notif_count := 0;

    -- Clientes parados ha 5+ dias
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'CLIENTE_PARADO',
      'Cliente sem contato',
      c.nome || ' esta ha ' ||
        extract(day from now() - c.ultima_atividade_em)::int || ' dias sem atividade.',
      '/dashboard/clientes/' || c.id
    from clientes c
    where c.corretor_responsavel_id = corretor.id
      and c.deleted_at is null
      and c.etapa_atual in ('NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO')
      and c.ultima_atividade_em < now() - interval '5 days'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'CLIENTE_PARADO'
          and n.link = '/dashboard/clientes/' || c.id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;

    get diagnostics notif_count = row_count;

    -- Agendamentos para hoje
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'AGENDAMENTO_HOJE',
      'Visita hoje',
      coalesce(cl.nome, 'Cliente') || ' as ' ||
        to_char(a.data_hora, 'HH24:MI') ||
        coalesce(' — ' || a.empreendimento_interesse, ''),
      '/dashboard/clientes/' || a.cliente_id
    from agendamentos a
    join clientes cl on cl.id = a.cliente_id
    where a.corretor_id = corretor.id
      and a.data_hora >= current_date
      and a.data_hora < current_date + interval '1 day'
      and a.status = 'AGENDADO'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'AGENDAMENTO_HOJE'
          and n.link = '/dashboard/clientes/' || a.cliente_id
          and n.lida = false
          and n.created_at > current_date
      )
    limit 3;

    -- Agendamentos para amanha
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'AGENDAMENTO_AMANHA',
      'Visita amanha',
      coalesce(cl.nome, 'Cliente') || ' as ' ||
        to_char(a.data_hora, 'HH24:MI') ||
        coalesce(' — ' || a.empreendimento_interesse, ''),
      '/dashboard/clientes/' || a.cliente_id
    from agendamentos a
    join clientes cl on cl.id = a.cliente_id
    where a.corretor_id = corretor.id
      and a.data_hora >= current_date + interval '1 day'
      and a.data_hora < current_date + interval '2 days'
      and a.status = 'AGENDADO'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'AGENDAMENTO_AMANHA'
          and n.link = '/dashboard/clientes/' || a.cliente_id
          and n.lida = false
          and n.created_at > current_date
      )
    limit 3;

    -- Documentos pendentes
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'DOCUMENTO_PENDENTE',
      'Documento pendente',
      cl.nome || ' — ' || d.tipo || ' aguardando validacao.',
      '/dashboard/clientes/' || d.cliente_id
    from documentos d
    join clientes cl on cl.id = d.cliente_id
    where cl.corretor_responsavel_id = corretor.id
      and d.status_validacao = 'PENDENTE'
      and d.deleted_at is null
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'DOCUMENTO_PENDENTE'
          and n.link = '/dashboard/clientes/' || d.cliente_id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;

    -- Pos-venda com prazo vencendo
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'POS_VENDA_PRAZO',
      'Prazo de pos-venda',
      cl.nome || ' — ' || coalesce(cl.proxima_acao, 'acao pendente') ||
        case
          when cl.proxima_acao_em < now() then ' (VENCIDO)'
          when cl.proxima_acao_em < now() + interval '3 days' then ' (proximo)'
          else ''
        end,
      '/dashboard/clientes/' || cl.id
    from clientes cl
    where cl.corretor_responsavel_id = corretor.id
      and cl.deleted_at is null
      and cl.etapa_atual = 'POS_VENDA'
      and cl.proxima_acao_em is not null
      and cl.proxima_acao_em < now() + interval '3 days'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'POS_VENDA_PRAZO'
          and n.link = '/dashboard/clientes/' || cl.id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;
  end loop;
end;
$$;

-- ── CORRECAO 3: Trigger notificar_fechamento simplificado ────────────────────
-- Removido "or old.ficha_proposta_assinada is null" — UPDATE sempre tem old.
create or replace function notificar_fechamento()
returns trigger as $$
begin
  if new.ficha_proposta_assinada = true
     and old.ficha_proposta_assinada = false then
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    values (
      new.corretor_responsavel_id,
      'FECHAMENTO_REALIZADO',
      'Fechamento realizado!',
      new.nome || ' assinou a ficha proposta.',
      '/dashboard/clientes/' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notificar_fechamento
  after update on clientes
  for each row execute function notificar_fechamento();

create or replace function notificar_analise()
returns trigger as $$
begin
  if new.resultado_analise is not null
     and (old.resultado_analise is null or old.resultado_analise <> new.resultado_analise) then
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    values (
      new.corretor_responsavel_id,
      'ANALISE_CONCLUIDA',
      'Analise concluida',
      new.nome || ' — Resultado: ' || new.resultado_analise,
      '/dashboard/clientes/' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notificar_analise
  after update on clientes
  for each row execute function notificar_analise();

-- ==========================================================================
-- 0011 — TRIAGEM DE ATENDIMENTO (LEADS)
-- ==========================================================================

create type origem_atendimento as enum ('LEAD','LISTAS','INDICACAO','CARTEIRA');

create type motivo_nao_atendimento as enum (
  'NAO_RESPONDEU','JA_COMPROU','PAROU_DE_RESPONDER','BLOQUEOU_CORRETOR',
  'NAO_TEM_INTERESSE','NUMERO_NAO_EXISTE','NUMERO_ERRADO'
);

create table leads (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  telefone               text not null,
  origem                 origem_atendimento not null,
  fez_ligacao            boolean not null default false,
  ligou_whatsapp         boolean not null default false,
  deixou_mensagem        boolean not null default false,
  seguiu                 boolean,
  motivo_nao_seguiu      motivo_nao_atendimento,
  corretor_id            uuid not null references usuarios (id),
  convertido_cliente_id  uuid unique references clientes (id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  constraint leads_motivo_obrigatorio
    check (seguiu is distinct from false or motivo_nao_seguiu is not null)
);
create index idx_leads_corretor on leads (corretor_id, created_at);
create index idx_leads_seguiu on leads (seguiu) where deleted_at is null;

create trigger set_updated_at before update on leads
  for each row execute function trg_fn_set_updated_at();
create trigger auditoria after insert or update or delete on leads
  for each row execute function trg_fn_auditoria();

create or replace function trg_fn_lead_producao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.fez_ligacao then
    perform fn_upsert_producao(new.corretor_id, 'ligacoes');
  end if;
  if new.ligou_whatsapp or new.deixou_mensagem then
    perform fn_upsert_producao(new.corretor_id, 'whatsapp');
  end if;
  return new;
end $$;

create trigger lead_producao after insert on leads
  for each row execute function trg_fn_lead_producao();

alter table leads enable row level security;
create policy leads_select on leads for select using (
  is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id)
);
create policy leads_insert on leads for insert with check (
  corretor_id = auth.uid() or is_admin()
);
create policy leads_update on leads for update using (
  is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id)
);

alter table clientes add column regiao_interesse text;
alter table clientes add column forma_renda text;

-- ==========================================================================
-- 0012 — CLT BOOL + DEPENDENTES BOOL
-- ==========================================================================

alter table clientes add column tres_anos_clt boolean not null default false;
alter table clientes add column possui_dependente boolean not null default false;
alter table conjuges add column tres_anos_clt boolean not null default false;

-- Backfill a partir dos dados ja cadastrados
update clientes set tres_anos_clt = true
 where tempo_clt_meses is not null and tempo_clt_meses >= 36;
update clientes set possui_dependente = true where dependentes > 0;
update conjuges set tres_anos_clt = true
 where tempo_clt_meses is not null and tempo_clt_meses >= 36;

-- ==========================================================================
-- 0013 — CPF OPCIONAL + DATA NASCIMENTO
-- ==========================================================================

alter table clientes alter column cpf drop not null;
alter table clientes add column data_nascimento date;

alter table clientes add constraint clientes_nascimento_plausivel
  check (data_nascimento is null
         or (data_nascimento > '1900-01-01' and data_nascimento < now()::date));

-- ==========================================================================
-- 0014-0016 — PASTA DIGITAL CONSOLIDADA
-- Inclui: COMPROVANTE_ENDERECO (0015), certidoes + de_dependente (0016),
-- e a versao FINAL de fn_pasta_completa que exclui docs de dependentes.
-- Pula redefinicoes intermediarias e DO block de reavaliacao desnecessarios.
-- ==========================================================================

alter type tipo_documento add value if not exists 'COMPROVANTE_ENDERECO';
alter type tipo_documento add value if not exists 'CERTIDAO_NASCIMENTO';
alter type tipo_documento add value if not exists 'CERTIDAO_CASAMENTO';
alter type tipo_documento add value if not exists 'CERTIDAO_CASAMENTO_AVERBACAO';
alter type tipo_documento add value if not exists 'MO_AUTODECLARACAO_DEPENDENTE';

alter table documentos add column de_dependente boolean not null default false;

-- Adiciona coluna pasta_completa_em em clientes (originalmente em 0006)
alter table clientes add column if not exists pasta_completa_em timestamptz;

-- fn_pasta_completa: versao FINAL consolidada
-- Checklist essencial: identidade (RG ou CNH) + comprovante renda + comprovante endereco
-- Documentos de dependente (de_dependente=true) NAO contam para a pasta.
create or replace function fn_pasta_completa(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text in ('RG','CNH')
              and not de_dependente and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text = 'COMPROVANTE_RENDA'
              and not de_dependente and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text = 'COMPROVANTE_ENDERECO'
              and not de_dependente and deleted_at is null);
$$;

-- Trigger documento_pasta (originalmente em 0006) — agora com fn_pasta_completa final
create or replace function trg_fn_documento_pasta() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cliente clientes%rowtype;
begin
  select * into v_cliente from clientes where id = new.cliente_id;

  if v_cliente.pasta_completa_em is null and fn_pasta_completa(new.cliente_id) then
    update clientes set pasta_completa_em = now() where id = new.cliente_id;
    perform fn_upsert_producao(v_cliente.corretor_responsavel_id, 'pastas');
  end if;

  return new;
end $$;

create trigger documento_pasta after insert on documentos
  for each row execute function trg_fn_documento_pasta();

-- ==========================================================================
-- 0017 — GRAU DE PARENTESCO
-- ==========================================================================

alter table documentos add column if not exists grau_parentesco text;

-- ==========================================================================
-- 0018 — FUSO HORARIO (America/Sao_Paulo)
-- ==========================================================================

create or replace function fn_upsert_producao(p_usuario uuid, p_coluna text) returns void
language plpgsql security definer set search_path = public as $$
begin
  execute format(
    'insert into producao_diaria (usuario_id, data, %1$I)
       values ($1, (now() at time zone ''America/Sao_Paulo'')::date, 1)
     on conflict (usuario_id, data) do update set %1$I = producao_diaria.%1$I + 1',
    p_coluna
  ) using p_usuario;
end $$;

-- ==========================================================================
-- 0019 — RANKING PUBLICO DA CENTRAL DE OPERACOES
-- ==========================================================================

create or replace function fn_ranking_mes()
returns table (
  usuario_id uuid,
  nome       text,
  pontos     numeric,
  vendas     bigint,
  producao   bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.nome,
    coalesce(sum(p.pontuacao_gamificacao), 0)            as pontos,
    coalesce(sum(p.vendas), 0)                           as vendas,
    coalesce(sum(p.ligacoes + p.whatsapp + p.follow_ups
                 + p.agendamentos + p.comparecimentos
                 + p.pastas), 0)                         as producao
  from usuarios u
  left join producao_diaria p
    on p.usuario_id = u.id
   and p.data >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
  where u.ativo and u.deleted_at is null
  group by u.id, u.nome
  order by pontos desc, vendas desc, producao desc;
$$;

revoke all on function fn_ranking_mes() from public;
grant execute on function fn_ranking_mes() to authenticated;

-- ==========================================================================
-- 0020 — MÓDULO AGENDA
-- Colunas 'local' e 'observacao' em agendamentos + indices de busca
-- ==========================================================================

alter table agendamentos
  add column if not exists local text;

alter table agendamentos
  add column if not exists observacao text;

create index if not exists idx_agendamentos_status
  on agendamentos (status)
  where deleted_at is null;

create index if not exists idx_agendamentos_observacao_trgm
  on agendamentos using gin (observacao gin_trgm_ops)
  where observacao is not null;

-- Backfill: copia observacao da atividade associada mais recente
update agendamentos a
set observacao = (
  select ativ.observacao
  from atividades ativ
  where ativ.cliente_id = a.cliente_id
    and ativ.resultado = 'Visita agendada'
    and ativ.created_at >= a.created_at
    and ativ.created_at <= a.created_at + interval '5 minutes'
  order by ativ.created_at desc
  limit 1
)
where a.observacao is null;

-- ==========================================================================
-- FIM DO RESET COMPLETO. Todas as 20 migrations aplicadas com correcoes.
-- ==========================================================================
