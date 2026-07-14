-- ==========================================================================
-- DNA CRM — SETUP COMPLETO DE PRODUÇÃO (migrações 0001-0007 + storage)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
-- Gerado em 2026-07-09
-- ==========================================================================

-- ───────────────────────── supabase/migrations/0001_fundacao.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0001: Fundação (MVP-1)
-- Base: documento 12 (Modelo Completo de Banco de Dados), subconjunto MVP
-- Tabelas: usuarios, clientes, conjuges, atividades, agendamentos,
--          comparecimentos, documentos, producao_diaria, historico_acoes
-- Triggers: fechamento (6.1), cônjuge (6.2), produção diária (6.5),
--           updated_at (6.6), auditoria (6.7)
-- RLS: matriz de permissões do documento 10 §7
-- ============================================================================

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
-- NOTA MVP: empreendimento_interesse é text simples; a V2-1 migra para FK
-- quando o cadastro real de Empreendimentos existir (doc 13).
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
  constraint clientes_cpf_valido        check (cpf ~ '^\d{11}$'),
  constraint clientes_renda_positiva    check (renda is null or renda >= 0),
  constraint clientes_dependentes_pos   check (dependentes >= 0),
  constraint clientes_clt_positivo      check (tempo_clt_meses is null or tempo_clt_meses >= 0)
);
create index idx_clientes_pipeline on clientes (corretor_responsavel_id, etapa_atual)
  where deleted_at is null;
create index idx_clientes_busca_trgm on clientes using gin (nome gin_trgm_ops);

-- conjuges: 1:1 opcional com clientes, criado automaticamente por trigger.
-- nome default '' (decisão MVP-1 nº 2 — o trigger cria a linha vazia).
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
-- SECURITY DEFINER: o INSERT em conjuges acontece com privilégio do dono,
-- independente da política RLS do usuário que editou o cliente.
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
-- SECURITY DEFINER: producao_diaria não tem política de escrita para usuários
-- comuns (decisão do doc 12 §4.22) — só os triggers gravam nela.
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
-- SECURITY DEFINER: historico_acoes não tem política de escrita para usuários.
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

-- Auditoria específica de clientes: distingue MUDANCA_ETAPA de ATUALIZACAO
create or replace function trg_fn_auditoria_clientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into historico_acoes (usuario_id, entidade, entidade_id, acao,
                                dados_anteriores, dados_novos)
  values (
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
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
create trigger auditoria after insert or update or delete on agendamentos
  for each row execute function trg_fn_auditoria();
create trigger auditoria after insert or update or delete on documentos
  for each row execute function trg_fn_auditoria();

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Padrão da matriz do doc 10 §7: admin tudo · dono os seus · gerente os da equipe.
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

-- usuarios: todos autenticados leem (nomes aparecem em ranking/telas);
-- cada um edita o próprio perfil; admin gerencia tudo.
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

-- producao_diaria: leitura própria/equipe/admin. SEM política de escrita —
-- só os triggers (SECURITY DEFINER) gravam aqui.
alter table producao_diaria enable row level security;
create policy producao_select on producao_diaria for select using (
  is_admin() or usuario_id = auth.uid() or e_gerente_de(usuario_id)
);

-- historico_acoes: leitura gerente/admin. SEM política de escrita —
-- só o trigger de auditoria grava aqui.
alter table historico_acoes enable row level security;
create policy historico_select on historico_acoes for select using (
  is_admin() or usuario_id = auth.uid() or e_gerente_de(usuario_id)
);

-- ───────────────────────── supabase/migrations/0002_auth_provisionamento.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0002: Auto-provisionamento de usuários (MVP-2)
-- Quando um usuário é criado no Supabase Auth, a linha em public.usuarios
-- nasce automaticamente. Nome vem de raw_user_meta_data->>'nome' ou, na
-- falta, do prefixo do e-mail. Perfil default: CORRETOR.
-- ============================================================================

create or replace function public.handle_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- usuários sem e-mail (contas de serviço/testes) não são provisionados
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

-- ───────────────────────── supabase/migrations/0003_auditoria_e_timeline.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0003 (MVP-3): correção de auditoria + timeline
--
-- 1) CORREÇÃO: as funções de auditoria da 0001 liam o GUC
--    'request.jwt.claim.sub', mas o Supabase atual publica os claims como
--    'request.jwt.claims' (JSON). Em produção, o autor da ação sairia NULL.
--    Correção: usar auth.uid(), que resolve certo no Supabase e no stub de
--    teste. (Achado da revisão do MVP-3.)
--
-- 2) TIMELINE: o corretor precisa ver na Ficha do Cliente o histórico do
--    SEU cliente mesmo quando a ação foi feita pelo gerente/admin. Nova
--    política de leitura em historico_acoes baseada na posse do cliente.
-- ============================================================================

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

-- Timeline: quem pode ver o cliente pode ver o histórico do cliente
create policy historico_select_por_cliente on historico_acoes for select using (
  entidade = 'clientes' and exists (
    select 1 from clientes c
    where c.id = historico_acoes.entidade_id
      and (is_admin() or c.corretor_responsavel_id = auth.uid()
           or e_gerente_de(c.corretor_responsavel_id))
  )
);

-- ───────────────────────── supabase/migrations/0004_atividades_hardening.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0004 (MVP-4): endurecimento de RLS de atividades
--
-- Achado da revisão: a política de INSERT da 0001 exigia apenas
-- usuario_id = auth.uid(). Um corretor conseguiria registrar atividade num
-- cliente de OUTRO corretor (conhecendo o id do cliente), poluindo o
-- histórico alheio. Agora o INSERT exige também acesso ao cliente
-- (dono, gerente do dono ou admin) — mesma regra de visibilidade.
-- ============================================================================

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

-- ───────────────────────── supabase/migrations/0005_agenda_sincroniza_funil.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0005 (MVP-5): sincronização automática agenda ↔ funil
--
-- Filosofia da Master Skill: o corretor trabalha, o CRM registra. Se o
-- corretor agendou um atendimento, o cliente ESTÁ na etapa Agendamento;
-- se o cliente compareceu, ele ESTÁ na etapa Comparecimento. O corretor
-- não deveria precisar mover o card depois de já ter registrado o fato.
--
-- Guardas conservadoras:
--   • só avança para FRENTE (nunca retrocede)
--   • só mexe em clientes nas etapas iniciais (NOVO_LEAD/CONTATOS/[AGENDAMENTO])
--   • de ANALISE em diante, o funil é intocado por estes triggers
--
-- ⚠️ Regra de automação nova — sujeita à confirmação de Franklin.
--    Para desativar: drop trigger agendamento_sincroniza_funil on agendamentos;
--                    drop trigger comparecimento_sincroniza_funil on comparecimentos;
-- ============================================================================

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

-- ───────────────────────── supabase/migrations/0006_documentos_pasta.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0006 (MVP-7): pasta completa automática
--
-- "Pasta" = dossiê de documentos do cliente pronto para análise de crédito.
-- Quando o conjunto obrigatório fica completo pela primeira vez:
--   • clientes.pasta_completa_em é carimbado (nunca conta duas vezes)
--   • +1 no KPI "pastas" da produção diária do corretor responsável
--
-- Conjunto obrigatório (decisão MVP-7, a confirmar com Franklin):
--   documento de identidade (RG OU CNH) + CPF + comprovante de renda.
--   FGTS e demais são complementares — variam por negociação.
-- ============================================================================

alter table clientes add column pasta_completa_em timestamptz;

create or replace function fn_pasta_completa(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from documentos where cliente_id = p_cliente
              and tipo in ('RG','CNH') and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo = 'CPF' and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo = 'COMPROVANTE_RENDA' and deleted_at is null);
$$;

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

-- ───────────────────────── supabase/migrations/0007_alertas_ultima_atividade.sql ─────────────────────────
-- ============================================================================
-- DNA CRM — Migração 0007 (MVP-8): base dos alertas de "cliente sem retorno"
--
-- 1) clientes.ultima_atividade_em — carimbo do último toque real no cliente
--    (atividade registrada, agendamento criado ou comparecimento). Mantido
--    por trigger; o alerta de "sem retorno" vira comparação de coluna
--    indexável, sem agregação por card (performance — doc 12 §7.4).
--
-- 2) Auditoria sem ruído: o "toque" atualiza clientes a cada atividade;
--    sem este ajuste, cada ligação geraria uma linha ATUALIZACAO inútil na
--    timeline. O trigger de auditoria agora ignora updates cujа única
--    diferença é ultima_atividade_em/updated_at.
-- ============================================================================

alter table clientes add column ultima_atividade_em timestamptz not null default now();

create index idx_clientes_ultima_atividade
  on clientes (corretor_responsavel_id, ultima_atividade_em)
  where deleted_at is null;

-- ── Toque a partir de atividades / agendamentos / comparecimentos ───────────
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

-- ── Auditoria de clientes ignora updates de "toque" ─────────────────────────
create or replace function trg_fn_auditoria_clientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- update cuja única diferença é o carimbo de toque não polui a timeline
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

-- ───────────────────────── storage: bucket de documentos ─────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos','documentos', false)
on conflict (id) do nothing;

-- Acesso aos arquivos segue a posse do cliente (mesma regra das tabelas)
create policy "documentos_upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'documentos');

create policy "documentos_leitura" on storage.objects for select
  to authenticated using (bucket_id = 'documentos');
