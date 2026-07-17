-- ============================================================================
-- DNA CRM — Migração 0009: CLT e dependentes como sim/não (pedido de Franklin)
-- Alinha o cadastro ao Forms original ("3 ANOS DE CLT?" / "POSSUI DEPENDENTE"
-- — sim/não) e ao doc 08. As colunas numéricas antigas permanecem para
-- histórico, mas a tela passa a usar os campos booleanos.
-- ============================================================================

alter table clientes add column tres_anos_clt boolean not null default false;
alter table clientes add column possui_dependente boolean not null default false;
alter table conjuges add column tres_anos_clt boolean not null default false;

-- Backfill a partir dos dados já cadastrados
update clientes set tres_anos_clt = true
 where tempo_clt_meses is not null and tempo_clt_meses >= 36;
update clientes set possui_dependente = true where dependentes > 0;
update conjuges set tres_anos_clt = true
 where tempo_clt_meses is not null and tempo_clt_meses >= 36;
