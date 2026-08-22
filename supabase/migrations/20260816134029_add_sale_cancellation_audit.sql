alter table public.sales
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_notes text,
  add column if not exists cancellation_actor text;

create index if not exists idx_sales_active_closed_at
  on public.sales (closed_at desc)
  where cancelled_at is null;

create or replace function public.cancel_sale(
  p_sale_id bigint,
  p_reason text,
  p_notes text,
  p_actor text default 'Franklin Monteiro'
)
returns public.sales
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale public.sales;
  v_stage text;
  v_next_action text;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Informe o motivo do cancelamento.';
  end if;
  if nullif(btrim(p_notes), '') is null then
    raise exception 'Descreva o que ocorreu antes de cancelar a venda.';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Venda não encontrada.';
  end if;
  if v_sale.cancelled_at is not null then
    raise exception 'Esta venda já foi cancelada.';
  end if;

  v_stage := case p_reason
    when 'Cliente desistiu' then 'Desistiu'
    when 'Cliente bloqueou o corretor' then 'Contato bloqueado'
    when 'Cliente sem contato' then 'Reativação'
    when 'Banco/CCA barrou' then 'Análise'
    else 'Follow-up'
  end;
  v_next_action := case p_reason
    when 'Cliente desistiu' then null
    when 'Cliente bloqueou o corretor' then null
    when 'Cliente sem contato' then 'Tentar reativação do cliente'
    when 'Banco/CCA barrou' then 'Reavaliar crédito e documentação'
    else 'Reavaliar oportunidade cancelada'
  end;

  update public.sales
  set status = 'Cancelada',
      cancelled_at = now(),
      cancellation_reason = btrim(p_reason),
      cancellation_notes = btrim(p_notes),
      cancellation_actor = coalesce(nullif(btrim(p_actor), ''), 'Franklin Monteiro')
  where id = p_sale_id
  returning * into v_sale;

  update public.clients
  set funnel_stage = v_stage,
      finance_stage = case
        when p_reason = 'Banco/CCA barrou' then 'Restrição'
        else finance_stage
      end,
      post_sale_stage = null,
      next_action = v_next_action,
      next_action_at = null,
      updated_at = now()
  where id = v_sale.client_id;

  insert into public.client_events (
    client_id, event_type, title, description, old_stage, new_stage, metric_key
  ) values (
    v_sale.client_id,
    'SALE_CANCELLED',
    'Venda cancelada',
    format(
      'Motivo: %s. Detalhes: %s. VGV retirado: R$ %s. Comissão: %s%%. Responsável: %s.',
      btrim(p_reason),
      btrim(p_notes),
      to_char(v_sale.vgv, 'FM999G999G999D00'),
      trim(to_char(v_sale.commission_rate, 'FM999D999')),
      coalesce(nullif(btrim(p_actor), ''), 'Franklin Monteiro')
    ),
    'Fechado',
    v_stage,
    null
  );

  return v_sale;
end;
$$;

revoke all on function public.cancel_sale(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.cancel_sale(bigint, text, text, text) to service_role;
