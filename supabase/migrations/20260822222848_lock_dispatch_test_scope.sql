create or replace function public.enforce_whatsapp_dispatch_queue_test_scope()
returns trigger language plpgsql security invoker set search_path = public as $$
declare c public.whatsapp_campaigns%rowtype;
begin
  if tg_op = 'UPDATE' then
    if not old.is_dry_run and (
      new.campaign_id is distinct from old.campaign_id
      or new.client_id is distinct from old.client_id
      or new.is_dry_run is distinct from old.is_dry_run
    ) then raise exception 'REAL_QUEUE_SCOPE_IMMUTABLE'; end if;
  end if;
  if not new.is_dry_run then
    select * into c from public.whatsapp_campaigns
      where id = new.campaign_id for share;
    if c.id is null or c.dry_run or not c.test_only
      or not coalesce(new.client_id = any(c.test_client_ids), false) then
      raise exception 'REAL_QUEUE_OUTSIDE_TEST_SCOPE';
    end if;
  end if;
  return new;
end;
$$;
