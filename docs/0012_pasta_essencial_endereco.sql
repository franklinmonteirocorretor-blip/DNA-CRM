-- ============================================================================
-- DNA CRM — Migração 0012: checklist essencial da pasta (pedido de Franklin)
-- Essenciais: identificação (RG+CPF ou CNH atualizada) + comprovante de renda
-- (contracheque, IR, extratos, pró-labore) + comprovante de endereço.
-- ============================================================================

alter type tipo_documento add value if not exists 'COMPROVANTE_ENDERECO';

create or replace function fn_pasta_completa(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text in ('RG','CNH') and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text = 'COMPROVANTE_RENDA' and deleted_at is null)
    and exists (select 1 from documentos where cliente_id = p_cliente
              and tipo::text = 'COMPROVANTE_ENDERECO' and deleted_at is null);
$$;

-- Pastas já carimbadas permanecem válidas (regra ficou mais exigente só daqui
-- para frente).
