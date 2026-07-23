-- ==========================================================================
-- DNA CRM — Sprint 4: Gestão de Corretores e Equipes (migration 0021)
-- Adiciona campos profissionais à tabela usuarios e cria tabela equipes.
-- ==========================================================================

-- 1. Novo enum: status_usuario (substitui o simples booleano 'ativo')
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_usuario') then
    create type status_usuario as enum ('ATIVO', 'FERIAS', 'AFASTADO', 'DESLIGADO');
  end if;
end;
$$;

-- 2. Adiciona 'SUPERVISOR' ao enum perfil_usuario existente
do $$
begin
  alter type perfil_usuario add value if not exists 'SUPERVISOR';
end;
$$;

-- 3. Novas colunas na tabela usuarios
alter table usuarios
  add column if not exists cpf              text,
  add column if not exists creci            text,
  add column if not exists data_admissao    date,
  add column if not exists cargo            text,
  add column if not exists supervisor_id    uuid references usuarios (id),
  add column if not exists status_usuario   status_usuario not null default 'ATIVO',
  add column if not exists equipe_id        uuid; -- FK será adicionada após criar equipes

-- 4. Migra 'ativo' booleano para o novo enum (backfill)
update usuarios
  set status_usuario = case
    when ativo  = true  then 'ATIVO'::status_usuario
    when ativo  = false then 'DESLIGADO'::status_usuario
    else 'ATIVO'::status_usuario
  end
where status_usuario is null;

-- 5. Índices para novas colunas
create index if not exists idx_usuarios_cpf       on usuarios (cpf)       where cpf is not null;
create index if not exists idx_usuarios_creci     on usuarios (creci)     where creci is not null;
create index if not exists idx_usuarios_supervisor on usuarios (supervisor_id);
create index if not exists idx_usuarios_status     on usuarios (status_usuario);
create index if not exists idx_usuarios_equipe     on usuarios (equipe_id) where equipe_id is not null;

-- 6. Tabela equipes
create table if not exists equipes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  gerente_id  uuid references usuarios (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint equipes_nome_unico unique (nome) where deleted_at is null
);

create index if not exists idx_equipes_gerente on equipes (gerente_id);

-- 7. FK de equipe_id em usuarios
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'usuarios_equipe_id_fkey'
  ) then
    alter table usuarios
      add constraint usuarios_equipe_id_fkey
      foreign key (equipe_id) references equipes (id);
  end if;
end;
$$;

-- 8. Trigger updated_at para equipes
create or replace function fn_update_equipes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_equipes_updated_at'
  ) then
    create trigger trg_equipes_updated_at
      before update on equipes
      for each row execute function fn_update_equipes_updated_at();
  end if;
end;
$$;

-- 9. Opcional: trigger de soft-delete em equipes (propaga para usuarios?)
-- Não implementado automaticamente — a transferência de carteira é manual via ação.

-- 10. Garante que o ADMIN inicial tenha status ATIVO
update usuarios
  set status_usuario = 'ATIVO'
where perfil = 'ADMINISTRADOR' and status_usuario is null;