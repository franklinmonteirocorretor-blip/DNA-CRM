-- ==========================================================================
-- DNA CRM — Migration 0036: usuarios.ultima_atividade_em
-- Sincronização banco↔código (2026-08-07)
--
-- Motivo: o código (Central de Operação — operacao/actions.ts e
-- dashboard/page.tsx) lê usuarios.ultima_atividade_em para calcular
-- "minutosSemAtividade" dos corretores. Nenhuma migration anterior
-- criava essa coluna em usuarios (apenas em clientes).
-- ==========================================================================

-- 1. Coluna
alter table usuarios
  add column if not exists ultima_atividade_em timestamptz;

-- 2. Backfill: última atividade registrada ou updated_at
update usuarios u
  set ultima_atividade_em = coalesce(
    (select max(a.created_at) from atividades a where a.usuario_id = u.id and a.created_at is not null),
    u.updated_at
  )
where u.ultima_atividade_em is null;

-- 3. Índice (a Central de Operação ordena por atividade)
create index if not exists idx_usuarios_ultima_atividade
  on usuarios (ultima_atividade_em desc)
  where deleted_at is null;

-- 4. Função trigger: toque de atividade
create or replace function fn_touch_usuario_ultima_atividade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update usuarios
    set ultima_atividade_em = now()
  where id = new.usuario_id;
  return new;
end;
$$;

-- 5. Trigger em atividades (insert/update)
drop trigger if exists trg_touch_usuario_atividade on atividades;
create trigger trg_touch_usuario_atividade
  after insert or update on atividades
  for each row
  execute function fn_touch_usuario_ultima_atividade();
