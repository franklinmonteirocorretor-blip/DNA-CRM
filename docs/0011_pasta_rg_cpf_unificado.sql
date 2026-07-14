-- ============================================================================
-- DNA CRM — Migração 0011: RG e CPF viram um documento só (pedido de Franklin)
-- O documento de identidade (RG ou CNH) já traz o CPF — a pasta fica completa
-- com: identidade (RG ou CNH) + comprovante de renda.
-- ============================================================================

create or replace function fn_pasta_completa(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from documentos where cliente_id = p_cliente
              and tipo in ('RG','CNH') and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo = 'COMPROVANTE_RENDA' and deleted_at is null);
$$;

-- Reavalia clientes que já tinham identidade + renda mas travavam no CPF avulso
do $$
declare c record;
begin
  for c in
    select cl.id, cl.corretor_responsavel_id from clientes cl
    where cl.pasta_completa_em is null and fn_pasta_completa(cl.id)
  loop
    update clientes set pasta_completa_em = now() where id = c.id;
    perform fn_upsert_producao(c.corretor_responsavel_id, 'pastas');
  end loop;
end $$;
