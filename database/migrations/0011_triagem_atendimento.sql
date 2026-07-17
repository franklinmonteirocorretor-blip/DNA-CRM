-- ============================================================================
-- DNA CRM — Migração 0008: Triagem de Atendimento (pedido de Franklin 09/07)
-- Replica o fluxo do Google Forms "Controle de Atendimentos":
--   origem → nome/telefone → tentativas de contato → seguiu? → motivo OU cadastro
-- As tentativas de contato registradas na triagem contam na produção diária
-- (ligação/WhatsApp), como o Forms alimentava a planilha antiga.
-- ============================================================================

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

-- Tentativas de contato da triagem alimentam a produção diária
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

-- RLS: dono / gerente do dono / admin
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

-- Qualificação extra vinda do Forms → cadastro do cliente
alter table clientes add column regiao_interesse text;
alter table clientes add column forma_renda text;
