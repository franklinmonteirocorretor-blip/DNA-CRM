alter table public.whatsapp_campaigns
  add column test_client_ids bigint[] not null default '{}';

alter table public.whatsapp_campaigns
  add constraint whatsapp_campaigns_real_test_clients_check check (
    dry_run or (
      test_only and cardinality(test_client_ids) between 1 and 5
      and campaign_limit between 1 and 5
    )
  );

create or replace function public.materialize_whatsapp_campaign_real(
  p_campaign_id uuid,
  p_items jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.whatsapp_campaigns%rowtype;
  v_item jsonb;
  v_client_id bigint;
  v_step_id uuid;
  v_template_id uuid;
  v_template_version integer;
  v_media_id uuid;
  v_media_version integer;
  v_conversation public.whatsapp_conversations%rowtype;
  v_phone text;
  v_order integer;
  v_inserted integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 5 then
    raise exception 'REAL_ITEMS_MUST_BE_1_TO_5';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,0));
  select * into c from public.whatsapp_campaigns where id=p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if c.dry_run or not c.test_only or c.status <> 'OFF' or c.session_id is null
    or cardinality(c.test_client_ids) not between 1 and 5 then
    raise exception 'REAL_TEST_CAMPAIGN_REQUIRED';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' or (v_item - array[
      'clientId','cadenceStepId','templateId','templateVersion','mediaId','mediaVersion',
      'selectionOrder','scheduledFor','renderedBody'
    ]::text[]) <> '{}'::jsonb then raise exception 'INVALID_REAL_ITEM'; end if;
    v_client_id := (v_item->>'clientId')::bigint;
    v_step_id := (v_item->>'cadenceStepId')::uuid;
    v_template_id := (v_item->>'templateId')::uuid;
    v_template_version := (v_item->>'templateVersion')::integer;
    v_order := (v_item->>'selectionOrder')::integer;
    v_media_id := case when nullif(v_item->>'mediaId','') is null then null else (v_item->>'mediaId')::uuid end;
    v_media_version := case when v_media_id is null then null else (v_item->>'mediaVersion')::integer end;
    if not v_client_id = any(c.test_client_ids) or nullif(btrim(v_item->>'renderedBody'),'') is null
      or v_order < 1 then raise exception 'REAL_ITEM_OUTSIDE_TEST_SCOPE'; end if;
    if not exists (select 1 from public.clients where id=v_client_id and can_contact and not do_not_contact and opt_out_at is null)
      then raise exception 'REAL_CLIENT_NOT_CONTACTABLE'; end if;
    if not exists (select 1 from public.whatsapp_cadence_steps where id=v_step_id and cadence_id=c.cadence_id and active)
      then raise exception 'CADENCE_STEP_MISMATCH'; end if;
    if not exists (select 1 from public.whatsapp_campaign_templates where campaign_id=c.id and template_id=v_template_id and template_version=v_template_version)
      then raise exception 'CAMPAIGN_TEMPLATE_MISMATCH'; end if;
    select wc.* into v_conversation from public.whatsapp_conversations wc
      where wc.client_id=v_client_id and wc.session_id=c.session_id and wc.control_mode='auto'
        and nullif(wc.provider_identity,'') is not null and nullif(wc.phone_e164,'') is not null
      order by wc.updated_at desc limit 1;
    if v_conversation.id is null then raise exception 'TEST_CONVERSATION_IDENTITY_REQUIRED'; end if;
    select phone into v_phone from public.clients where id=v_client_id;
    if regexp_replace(coalesce(v_phone,''),'\D','','g') <> regexp_replace(v_conversation.phone_e164,'\D','','g')
      then raise exception 'TEST_CLIENT_IDENTITY_MISMATCH'; end if;

    insert into public.whatsapp_campaign_queue(
      campaign_id,client_id,cadence_step_id,cadence_id,template_id,template_version,
      media_id,media_version,selection_order,status,is_dry_run,scheduled_for,next_send_at,
      idempotency_key,rendered_body,phone_e164,conversation_id,provider_identity,
      last_inbound_seen_at
    ) values (
      c.id,v_client_id,v_step_id,c.cadence_id,v_template_id,v_template_version,
      v_media_id,v_media_version,v_order,'QUEUED',false,(v_item->>'scheduledFor')::timestamptz,
      (v_item->>'scheduledFor')::timestamptz,
      format('campaign:%s:client:%s:step:%s:template:%s:v%s:media:%s:v%s',
        c.id,v_client_id,v_step_id,v_template_id,v_template_version,
        coalesce(v_media_id::text,'none'),coalesce(v_media_version::text,'0')),
      btrim(v_item->>'renderedBody'),v_conversation.phone_e164,v_conversation.id,
      v_conversation.provider_identity,v_conversation.last_inbound_at
    );
    v_inserted := v_inserted + 1;
  end loop;
  return jsonb_build_object('campaignId',c.id,'inserted',v_inserted,'testOnly',true);
end;
$$;

revoke execute on function public.materialize_whatsapp_campaign_real(uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.materialize_whatsapp_campaign_real(uuid,jsonb) to service_role;
