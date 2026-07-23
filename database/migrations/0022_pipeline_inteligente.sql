-- ==========================================================================
-- DNA CRM — Sprint 5: Pipeline Inteligente (migration 0022)
-- Adiciona rastreamento de tempo nas etapas e trigger de próxima ação.
-- ==========================================================================

-- 1. Coluna: quando o cliente entrou NA ETAPA ATUAL
alter table clientes
  add column if not exists entrou_etapa_em timestamptz;

-- 2. Coluna JSONB: histórico completo de passagem por etapas
--    Formato: [{etapa, data_entrada, data_saida}, ...]
alter table clientes
  add column if not exists tempo_etapas jsonb default '[]'::jsonb;

-- 3. Backfill: entrou_etapa_em = updated_at para clientes existentes
update clientes
  set entrou_etapa_em = updated_at
where entrou_etapa_em is null;

-- 4. Índice para consultas por tempo na etapa (alertas de clientes parados)
create index if not exists idx_clientes_entrou_etapa
  on clientes (entrou_etapa_em)
  where deleted_at is null;

-- 5. Função trigger: ao mudar de etapa, registra no tempo_etapas e atualiza entrou_etapa_em
create or replace function fn_pipeline_mudanca_etapa()
returns trigger as $$
declare
  etapa_anterior text;
begin
  -- Só age se a etapa realmente mudou
  if new.etapa_atual is distinct from old.etapa_atual then
    etapa_anterior := old.etapa_atual;

    -- Registra a saída da etapa anterior no JSONB histórico
    new.tempo_etapas := old.tempo_etapas || jsonb_build_object(
      'etapa', etapa_anterior,
      'data_entrada', old.entrou_etapa_em,
      'data_saida', now()
    );

    -- Marca entrada na nova etapa
    new.entrou_etapa_em := now();

    -- Auto-define próxima ação baseada na nova etapa
    new.proxima_acao := case new.etapa_atual
      when 'NOVO_LEAD'       then 'Fazer primeiro contato (ligação)'
      when 'CONTATOS'        then 'Agendar análise financeira'
      when 'AGENDAMENTO'     then 'Confirmar presença na visita'
      when 'COMPARECIMENTO'  then 'Encaminhar para análise de crédito'
      when 'ANALISE'         then 'Solicitar documentação completa'
      when 'RESTRICOES'      then 'Resolver pendências financeiras'
      when 'CONDICIONADOS'   then 'Aguardar aprovação do banco'
      when 'APROVADOS'       then 'Agendar visita ao empreendimento'
      when 'FECHAMENTOS'     then 'Conferir documentação para contrato'
      when 'POS_VENDA'       then 'Solicitar indicação de novos clientes'
      else 'Acompanhar cliente'
    end;

    -- Define prazo sugerido para próxima ação (24h para etapas iniciais, 72h para avançadas)
    new.proxima_acao_em := case new.etapa_atual
      when 'NOVO_LEAD'       then now() + interval '24 hours'
      when 'CONTATOS'        then now() + interval '48 hours'
      when 'AGENDAMENTO'     then now() + interval '24 hours'
      when 'COMPARECIMENTO'  then now() + interval '48 hours'
      when 'ANALISE'         then now() + interval '72 hours'
      when 'RESTRICOES'      then now() + interval '72 hours'
      when 'CONDICIONADOS'   then now() + interval '72 hours'
      when 'APROVADOS'       then now() + interval '72 hours'
      when 'FECHAMENTOS'     then now() + interval '48 hours'
      when 'POS_VENDA'       then now() + interval '168 hours' -- 7 dias
      else now() + interval '72 hours'
    end;
  end if;

  return new;
end;
$$ language plpgsql;

-- 6. Trigger: antes de update em clientes
drop trigger if exists trg_pipeline_mudanca_etapa on clientes;
create trigger trg_pipeline_mudanca_etapa
  before update on clientes
  for each row
  execute function fn_pipeline_mudanca_etapa();

-- 7. Função para calcular tempo médio por etapa (para KPIs do pipeline)
create or replace function fn_tempo_medio_etapas()
returns table (etapa text, tempo_medio_horas numeric, quantidade int) as $$
begin
  return query
  with historico as (
    select
      jsonb_array_elements(tempo_etapas) as registro
    from clientes
    where deleted_at is null
      and tempo_etapas is not null
      and jsonb_array_length(tempo_etapas) > 0
  )
  select
    registro->>'etapa' as etapa,
    round(avg(
      extract(epoch from
        (registro->>'data_saida')::timestamptz -
        (registro->>'data_entrada')::timestamptz
      ) / 3600
    )::numeric, 1) as tempo_medio_horas,
    count(*) as quantidade
  from historico
  group by registro->>'etapa'
  order by etapa;
end;
$$ language plpgsql stable security definer;

-- 8. Função para VGV total por etapa (valor financeiro no pipeline)
create or replace function fn_vgv_por_etapa(p_corretor_id uuid default null)
returns table (etapa text, vgv_total numeric, comissao_total numeric, quantidade int) as $$
begin
  return query
  select
    c.etapa_atual::text,
    coalesce(sum(c.vgv), 0)::numeric,
    coalesce(sum(c.comissao_valor), 0)::numeric,
    count(*)::int
  from clientes c
  where c.deleted_at is null
    and (p_corretor_id is null or c.corretor_responsavel_id = p_corretor_id)
  group by c.etapa_atual
  order by c.etapa_atual;
end;
$$ language plpgsql stable security definer;