-- ============================================================================
-- DNA CRM — Migração 0015: produção diária no fuso da operação (Sprint 1)
-- Bug B1 da auditoria: fn_upsert_producao usava current_date (UTC na nuvem),
-- então KPIs registrados após as 21h de Brasília caíam no dia seguinte.
-- ============================================================================

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
