-- ============================================================================
-- DNA CRM — Migração 0010: CPF sai da qualificação; entra data de nascimento
-- (pedido de Franklin 10/07). O CPF chega depois, com a documentação da pasta.
-- A data de nascimento antecipa a análise de enquadramento por idade.
-- ============================================================================

alter table clientes alter column cpf drop not null;
alter table clientes add column data_nascimento date;

-- Guarda: nascimento plausível quando informado
alter table clientes add constraint clientes_nascimento_plausivel
  check (data_nascimento is null
         or (data_nascimento > '1900-01-01' and data_nascimento < now()::date));
