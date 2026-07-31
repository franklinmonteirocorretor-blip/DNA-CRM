-- ==========================================================================
-- DNA CRM — Sprint 13: Correção de Trigger de Comissão (migration 0032)
-- CORREÇÃO CRÍTICA: A função trg_fn_comissao_venda_fechada() foi definida 
-- na migration 0025 mas NUNCA foi atachada à tabela clientes.
-- Esta migration ativa o trigger que estava órfão.
-- ==========================================================================

-- Ativa o trigger de geração automática de comissão ao fechar venda
drop trigger if exists trg_comissao_venda_fechada on clientes;
create trigger trg_comissao_venda_fechada
  before update on clientes
  for each row
  execute function trg_fn_comissao_venda_fechada();