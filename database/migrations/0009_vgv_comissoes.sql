-- ============================================================================
-- DNA CRM — Migração 0009: VGV e Comissões
-- Adiciona campos de valor de venda e comissão para rankings financeiros.
-- ============================================================================

-- ── 1. Novos campos em clientes ──────────────────────────────────────────────
alter table clientes
  add column vgv                   numeric(12,2),
  add column comissao_percentual   numeric(5,2),
  add column comissao_valor        numeric(12,2);

-- ── 2. Constraints de validação ──────────────────────────────────────────────
alter table clientes
  add constraint clientes_vgv_positivo      check (vgv is null or vgv >= 0),
  add constraint clientes_comissao_pct_val  check (comissao_percentual is null or (comissao_percentual >= 0 and comissao_percentual <= 100)),
  add constraint clientes_comissao_positiva check (comissao_valor is null or comissao_valor >= 0);

-- ── 3. Trigger: calcula comissao_valor automaticamente ───────────────────────
-- Sempre que vgv ou comissao_percentual forem atualizados, recalcula comissao_valor.
-- Se ambos forem informados manualmente, mantém o valor manual.
create or replace function fn_calcular_comissao()
returns trigger as $$
begin
  -- Se VGV e percentual foram informados e comissao_valor está vazio,
  -- calcula automaticamente
  if new.vgv is not null and new.comissao_percentual is not null
     and new.comissao_valor is null then
    new.comissao_valor := round((new.vgv * new.comissao_percentual / 100)::numeric, 2);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_calcular_comissao
  before insert or update on clientes
  for each row execute function fn_calcular_comissao();

-- ── 4. Função para ranking de VGV (consolidado por corretor) ─────────────────
create or replace function get_ranking_vgv(
  p_data_inicio date,
  p_data_fim    date
)
returns table (
  corretor_id    uuid,
  corretor_nome  text,
  vgv_total      numeric,
  comissao_total numeric,
  fechamentos    bigint
) language sql security definer as $$
  select
    c.corretor_responsavel_id,
    u.nome,
    coalesce(sum(c.vgv), 0)::numeric(12,2) as vgv_total,
    coalesce(sum(c.comissao_valor), 0)::numeric(12,2) as comissao_total,
    count(*) as fechamentos
  from clientes c
  join usuarios u on u.id = c.corretor_responsavel_id
  where c.data_fechamento >= p_data_inicio
    and c.data_fechamento <= p_data_fim
    and c.ficha_proposta_assinada = true
    and c.deleted_at is null
  group by c.corretor_responsavel_id, u.nome
  order by vgv_total desc;
$$;