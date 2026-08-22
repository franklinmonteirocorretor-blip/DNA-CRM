alter table public.clients
  add column if not exists qualification jsonb not null default '{}'::jsonb;
alter table public.sales
  add column if not exists proposal_data jsonb not null default '{}'::jsonb;

create index if not exists idx_clients_updated_at on public.clients(updated_at desc);
create index if not exists idx_clients_name_search on public.clients using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists idx_clients_phone_search on public.clients(phone);

create or replace function public.transition_client_journey(
  p_client_id bigint,
  p_event_type text,
  p_title text,
  p_description text default '',
  p_funnel_stage text default null,
  p_finance_stage text default null,
  p_post_sale_stage text default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null,
  p_metric_key text default null,
  p_qualification jsonb default null
) returns public.clients
language plpgsql
security invoker
set search_path = public
as $$
declare
  previous public.clients;
  updated public.clients;
  old_stage_label text;
  new_stage_label text;
begin
  select * into previous from public.clients where id = p_client_id for update;
  if not found then raise exception 'Cliente nao encontrado'; end if;
  old_stage_label := concat_ws(' | ', previous.funnel_stage, previous.finance_stage, previous.post_sale_stage);
  update public.clients set
    funnel_stage = coalesce(p_funnel_stage, funnel_stage),
    finance_stage = coalesce(p_finance_stage, finance_stage),
    post_sale_stage = coalesce(p_post_sale_stage, post_sale_stage),
    next_action = case when p_next_action is not null then p_next_action else next_action end,
    next_action_at = case when p_next_action is not null or p_next_action_at is not null then p_next_action_at else next_action_at end,
    qualification = case when p_qualification is null then qualification else qualification || p_qualification end,
    updated_at = now()
  where id = p_client_id returning * into updated;
  new_stage_label := concat_ws(' | ', updated.funnel_stage, updated.finance_stage, updated.post_sale_stage);
  insert into public.client_events(client_id,event_type,title,description,old_stage,new_stage,metric_key,occurred_at)
  values(p_client_id,p_event_type,p_title,coalesce(p_description,''),old_stage_label,new_stage_label,p_metric_key,now());
  return updated;
end;
$$;

revoke execute on function public.transition_client_journey(bigint,text,text,text,text,text,text,text,timestamptz,text,jsonb) from public, anon, authenticated;
grant execute on function public.transition_client_journey(bigint,text,text,text,text,text,text,text,timestamptz,text,jsonb) to service_role;
