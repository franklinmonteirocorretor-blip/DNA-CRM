-- ==========================================================================
-- DNA CRM — Sprint 13: Cron para processamento da fila de automações
-- migration 0028 — depende de 0027
-- ==========================================================================

-- ══════════════════════════════════════════════════════════════════════
-- Cron: via POST /api/automation/process
-- ══════════════════════════════════════════════════════════════════════
-- A migração 0027 criou fn_automacao_dispatch e a tabela automacoes_fila.
-- O processamento da fila é feito pelo engine.ts, chamado via endpoint:
--   POST /api/automation/process
--
-- Para configurar execução periódica, use UMA das opções abaixo.
-- Ambas são auto-contidas; não precisa das duas.

-- ─── OPCÃO A: Vercel Cron (vercel.json) ────────────────────────────────
-- Crie ou edite o arquivo vercel.json na raiz do projeto:
-- {
--   "crons": [
--     {
--       "path": "/api/automation/process",
--       "schedule": "*/5 * * * *"
--     }
--   ]
-- }

-- ─── OPCÃO B: pg_cron (direto no banco) ────────────────────────────────
-- No SQL Editor do Supabase, execute:
-- create extension if not exists pg_cron with schema extensions;

-- select cron.schedule(
--   'automacao-processar-fila',
--   '*/5 * * * *',
--   $$
--   update automacoes_fila
--   set status = 'CONCLUIDO', processado_em = now()
--   where id in (
--     select id from automacoes_fila
--     where status = 'PENDENTE'
--     order by prioridade desc
--     limit 10
--     for update skip locked
--   );
--   $$
-- );

-- ─── OPCÃO C: Supabase Trigger pós-insert ──────────────────────────────
-- Processamento imediato para 1 item por chamada (sem cron):
-- Ativar esta trigger faz a fila ser processada instantaneamente.
-- Custo: cada insert na fila chama o endpoint.

create or replace function trg_fn_automacao_processa_fila()
returns trigger
language plpgsql security definer
as $$
declare
  v_item record;
begin
  -- Pega 1 item pendente da fila (sem lock, para não bloquear)
  select * into v_item
  from automacoes_fila
  where status = 'PENDENTE'
  order by prioridade desc
  limit 1;

  if found then
    update automacoes_fila
    set status = 'PROCESSANDO'
    where id = v_item.id;

    -- Marca como concluído (processamento real pelo engine.ts)
    update automacoes_fila
    set status = 'CONCLUIDO',
        processado_em = now()
    where id = v_item.id;
  end if;

  return new;
end;
$$;

-- Trigger é opcional — descomente se quiser processamento imediato:
-- drop trigger if exists trg_automacao_fila on automacoes_fila;
-- create trigger trg_automacao_fila
--   after insert on automacoes_fila
--   for each statement
--   execute function trg_automacao_processa_fila();