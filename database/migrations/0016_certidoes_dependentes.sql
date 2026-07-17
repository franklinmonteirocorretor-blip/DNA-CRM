-- ============================================================================
-- DNA CRM — Migração 0013: certidões + anexos de dependentes (Franklin 10/07)
-- 1) Novos tipos: certidão de nascimento, de casamento, de casamento com
--    averbação de divórcio e a MO de autodeclaração de dependente (Caixa).
-- 2) Seção separada de documentos de DEPENDENTES (coluna de_dependente).
--    Documentos de dependente NÃO contam para a pasta essencial do cliente.
-- ============================================================================

alter type tipo_documento add value if not exists 'CERTIDAO_NASCIMENTO';
alter type tipo_documento add value if not exists 'CERTIDAO_CASAMENTO';
alter type tipo_documento add value if not exists 'CERTIDAO_CASAMENTO_AVERBACAO';
alter type tipo_documento add value if not exists 'MO_AUTODECLARACAO_DEPENDENTE';

alter table documentos add column de_dependente boolean not null default false;

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
