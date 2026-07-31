-- ==========================================================================
-- DNA CRM — Sprint 13: Trigger de Gestão de Comissão (migration 0031)
-- Adiciona trigger que registra automaticamente no historico_acoes
-- toda mudança de status de comissão na tabela clientes.
-- ==========================================================================
--
-- PRÉ-REQUISITO: As migrations 0025 e 0027 usam o tipo "tipo_historico_acao"
-- contendo valores: COMISSAO_GERADA, COMISSAO_ALTERADA, COMISSAO_CANCELADA,
-- COMISSAO_REABERTA. Este script NÃO tenta criar/alterar o tipo — assume
-- que já existe no banco. Se o banco usa acao_auditoria (migration 0000),
-- os valores serão adicionados com segurança idempotente abaixo.

-- ─── Garantir valores no tipo de ação (idempotente) ─────────────────────

do $$
begin
  -- Caso o banco use acao_auditoria (tipo base da migration 0000)
  if exists (select 1 from pg_type where typname = 'acao_auditoria') then
    begin
      alter type acao_auditoria add value 'COMISSAO_ALTERADA';
    exception when duplicate_object then null; end;
    begin
      alter type acao_auditoria add value 'COMISSAO_CANCELADA';
    exception when duplicate_object then null; end;
    begin
      alter type acao_auditoria add value 'COMISSAO_REABERTA';
    exception when duplicate_object then null; end;
    begin
      alter type acao_auditoria add value 'COMISSAO_GERADA';
    exception when duplicate_object then null; end;
  end if;

  -- Se o banco já migrou para tipo_historico_acao (alias/rename manual)
  if exists (select 1 from pg_type where typname = 'tipo_historico_acao') then
    begin
      alter type tipo_historico_acao add value 'COMISSAO_ALTERADA';
    exception when duplicate_object then null; end;
    begin
      alter type tipo_historico_acao add value 'COMISSAO_CANCELADA';
    exception when duplicate_object then null; end;
    begin
      alter type tipo_historico_acao add value 'COMISSAO_REABERTA';
    exception when duplicate_object then null; end;
    begin
      alter type tipo_historico_acao add value 'COMISSAO_GERADA';
    exception when duplicate_object then null; end;
  end if;
end;
$$;

-- ─── Trigger: mudança de status de comissão → registro no historico_acoes

create or replace function trg_fn_comissao_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_acao text;
  v_label text;
begin
  -- Só atua se o status mudou
  if old.comissao_status is not distinct from new.comissao_status then
    return new;
  end if;

  -- Determina a ação com base no novo status
  case new.comissao_status
    when 'RECEBIDA' then
      v_acao := 'COMISSAO_ALTERADA';
      v_label := 'Comissão marcada como recebida via painel financeiro.';
    when 'CANCELADA' then
      v_acao := 'COMISSAO_CANCELADA';
      v_label := 'Comissão cancelada via painel financeiro.';
    when 'PREVISTA' then
      -- Só registra reativação se veio de CANCELADA (não de PREVISTA→PREVISTA)
      if old.comissao_status = 'CANCELADA' then
        v_acao := 'COMISSAO_REABERTA';
        v_label := 'Comissão reativada via painel financeiro.';
      else
        return new;
      end if;
    else
      return new;
  end case;

  -- Registra no histórico de ações (insert direto, sem cast de tipo
  -- para ser resiliente a mudanças de nome do enum no banco)
  insert into historico_acoes (entidade, entidade_id, acao, dados_anteriores, dados_novos, observacao, created_at)
  values (
    'clientes',
    new.id,
    v_acao,
    jsonb_build_object(
      'comissao_status', old.comissao_status,
      'comissao_data_recebimento', old.comissao_data_recebimento
    ),
    jsonb_build_object(
      'comissao_status', new.comissao_status,
      'comissao_data_recebimento', new.comissao_data_recebimento
    ),
    v_label,
    now()
  );

  return new;
end;
$$;

-- Ativa o trigger na tabela clientes
drop trigger if exists trg_comissao_status_change on clientes;
create trigger trg_comissao_status_change
  before update on clientes
  for each row
  execute function trg_fn_comissao_status_change();