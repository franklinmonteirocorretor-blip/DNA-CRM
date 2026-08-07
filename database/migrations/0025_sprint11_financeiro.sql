-- ==========================================================================
-- DNA CRM — Sprint 11: Financeiro Comercial (migration 0025)
-- Adiciona tracking de comissão na tabela clientes existente.
-- NÃO cria tabelas separadas — reutiliza relacionamento existente.
-- ==========================================================================

-- ─── Campos de status da comissão ────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name = 'clientes' and column_name = 'comissao_status'
    and table_schema = 'public') then
    alter table clientes add column comissao_status text default 'PREVISTA'
      check (comissao_status in ('PREVISTA', 'RECEBIDA', 'CANCELADA'));
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name = 'clientes' and column_name = 'comissao_data_prevista'
    and table_schema = 'public') then
    alter table clientes add column comissao_data_prevista date;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_name = 'clientes' and column_name = 'comissao_data_recebimento'
    and table_schema = 'public') then
    alter table clientes add column comissao_data_recebimento date;
  end if;
end;
$$;

-- Preenche status para vendas já fechadas sem status definido
update clientes
  set comissao_status = 'PREVISTA'
  where ficha_proposta_assinada = true
    and data_fechamento is not null
    and comissao_status is null
    and deleted_at is null;

-- Preenche data prevista como data_fechamento + 30 dias para registros existentes
update clientes
  set comissao_data_prevista = (data_fechamento::date + interval '30 days')::date
  where ficha_proposta_assinada = true
    and data_fechamento is not null
    and comissao_data_prevista is null
    and deleted_at is null;

-- ─── Índices para consultas financeiras ──────────────────────────────────────

-- Rankings de VGV (corretor + empreendimento)
create index if not exists idx_clientes_vgv_financeiro
  on clientes (corretor_responsavel_id, vgv desc)
  where ficha_proposta_assinada = true and deleted_at is null;

-- Comissões por status e data
create index if not exists idx_clientes_comissao_status_data
  on clientes (comissao_status, comissao_data_prevista)
  where ficha_proposta_assinada = true and deleted_at is null;

-- Previsão de recebimento (próximos 7/30/90 dias)
create index if not exists idx_clientes_comissao_prevista
  on clientes (comissao_data_prevista)
  where comissao_status = 'PREVISTA' and deleted_at is null;

-- Empreendimento + VGV para seção 5
create index if not exists idx_clientes_empreendimento_vgv
  on clientes (empreendimento_id, vgv desc)
  where ficha_proposta_assinada = true and deleted_at is null;

-- Comissão por corretor + status
create index if not exists idx_clientes_corretor_comissao
  on clientes (corretor_responsavel_id, comissao_status)
  where ficha_proposta_assinada = true and deleted_at is null;

-- ─── Trigger: Venda fechada → gera comissão prevista ────────────────────────

create or replace function trg_fn_comissao_venda_fechada()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Nova venda (ficha assinada + data fechamento definida)
  if new.ficha_proposta_assinada = true
     and new.data_fechamento is not null
     and (old.ficha_proposta_assinada is distinct from true
          or old.data_fechamento is distinct from new.data_fechamento) then

    -- Define status como PREVISTA se não definido
    if new.comissao_status is null then
      new.comissao_status := 'PREVISTA';
    end if;

    -- Define data prevista como data_fechamento + 45 dias se não definida
    if new.comissao_data_prevista is null then
      new.comissao_data_prevista := (new.data_fechamento::date + interval '45 days')::date;
    end if;

    -- Registra no histórico de ações
    insert into historico_acoes (entidade, entidade_id, acao, dados_novos, observacao, created_at)
    values (
      'clientes',
      new.id,
      'COMISSAO_GERADA'::tipo_historico_acao,
      jsonb_build_object(
        'vgv', new.vgv,
        'comissao_percentual', new.comissao_percentual,
        'comissao_valor', new.comissao_valor,
        'comissao_status', 'PREVISTA'
      ),
      'Comissão prevista gerada automaticamente na venda.',
      now()
    );
  end if;

  return new;
end;
$$;