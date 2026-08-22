create table public.whatsapp_dispatch_runtime_control (
  id smallint primary key default 1 check (id = 1),
  real_enabled boolean not null default false,
  authorized_session_id uuid references public.whatsapp_sessions(id) on delete restrict,
  authorization_expires_at timestamptz,
  authorization_reason text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    not real_enabled
    or (authorized_session_id is not null and authorization_expires_at is not null)
  )
);

insert into public.whatsapp_dispatch_runtime_control(id) values (1)
on conflict (id) do nothing;

alter table public.whatsapp_dispatch_runtime_control enable row level security;
revoke all on public.whatsapp_dispatch_runtime_control from public, anon, authenticated;
grant all on public.whatsapp_dispatch_runtime_control to service_role;

alter table public.whatsapp_campaign_queue
  add column phase_authorization_token uuid,
  add column phase_authorized_at timestamptz,
  add column phase_authorization_expires_at timestamptz,
  add column phase_authorized_lifecycle_version integer;

alter table public.whatsapp_campaign_queue
  add constraint whatsapp_campaign_queue_sending_authorization_check check (
    status not in ('SENDING_MEDIA','SENDING_TEXT')
    or (
      worker_id is not null
      and phase_authorization_token is not null
      and phase_authorized_at is not null
      and phase_authorization_expires_at is not null
      and phase_authorization_expires_at > phase_authorized_at
      and phase_authorized_lifecycle_version is not null
    )
  );

do $$
begin
  if exists (
    select 1 from public.whatsapp_campaign_queue q
    join public.whatsapp_campaigns c on c.id = q.campaign_id
    where not q.is_dry_run and (
      c.dry_run or not c.test_only
      or not coalesce(q.client_id = any(c.test_client_ids), false)
    )
  ) then raise exception 'EXISTING_REAL_QUEUE_OUTSIDE_TEST_SCOPE'; end if;
end;
$$;

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
      where id = new.campaign_id for key share;
    if c.id is null or c.dry_run or not c.test_only
      or not coalesce(new.client_id = any(c.test_client_ids), false) then
      raise exception 'REAL_QUEUE_OUTSIDE_TEST_SCOPE';
    end if;
  end if;
  return new;
end;
$$;

create trigger whatsapp_dispatch_queue_test_scope_guard
before insert or update of campaign_id, client_id, is_dry_run
on public.whatsapp_campaign_queue for each row
execute function public.enforce_whatsapp_dispatch_queue_test_scope();

create or replace function public.enforce_whatsapp_campaign_test_scope_immutability()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_distinct_count integer;
begin
  if not new.dry_run then
    if new.test_client_ids is null
      or cardinality(new.test_client_ids) not between 1 and 5
      or array_position(new.test_client_ids, null) is not null then
      raise exception 'REAL_TEST_SCOPE_INVALID';
    end if;
    select count(distinct value) into v_distinct_count
      from unnest(new.test_client_ids) as value;
    if v_distinct_count <> cardinality(new.test_client_ids) then
      raise exception 'REAL_TEST_SCOPE_DUPLICATED';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if exists (
      select 1 from public.whatsapp_campaign_queue q
      where q.campaign_id = old.id and not q.is_dry_run
    ) and (
      new.test_client_ids is distinct from old.test_client_ids
      or new.test_only is distinct from old.test_only
      or new.dry_run is distinct from old.dry_run
    ) then raise exception 'REAL_TEST_SCOPE_IMMUTABLE_AFTER_MATERIALIZATION'; end if;
  end if;
  return new;
end;
$$;

create trigger whatsapp_campaign_test_scope_immutability_guard
before insert or update of test_client_ids, test_only, dry_run
on public.whatsapp_campaigns for each row
execute function public.enforce_whatsapp_campaign_test_scope_immutability();

create index whatsapp_campaign_queue_active_lease_idx
  on public.whatsapp_campaign_queue(lease_expires_at)
  where status in ('PROCESSING','SENDING_MEDIA','SENDING_TEXT');

create or replace function public.configure_whatsapp_dispatch_runtime(
  p_enabled boolean,
  p_session_id uuid default null,
  p_expires_at timestamptz default null,
  p_reason text default null,
  p_updated_by text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_session public.whatsapp_sessions%rowtype;
  v_control public.agent_autonomy_config%rowtype;
begin
  if p_enabled is null then raise exception 'RUNTIME_AUTHORIZATION_STATE_REQUIRED'; end if;
  if nullif(btrim(coalesce(p_reason,'')), '') is null then
    raise exception 'RUNTIME_AUTHORIZATION_REASON_REQUIRED';
  end if;

  select * into v_control from public.agent_autonomy_config where id = 1;
  if p_enabled then
    if p_session_id is null or p_expires_at is null or p_expires_at <= now() then
      raise exception 'RUNTIME_AUTHORIZATION_WINDOW_INVALID';
    end if;
    if v_control.id is null or v_control.kill_switch or v_control.outbound_kill_switch then
      raise exception 'RUNTIME_KILL_SWITCH_ACTIVE';
    end if;
    select * into v_session from public.whatsapp_sessions where id = p_session_id;
    if v_session.id is null or v_session.status <> 'connected'
      or v_session.circuit_state <> 'closed' or v_session.heartbeat_at is null
      or v_session.heartbeat_at < now() - interval '90 seconds' then
      raise exception 'RUNTIME_SESSION_UNHEALTHY';
    end if;
  end if;

  insert into public.whatsapp_dispatch_runtime_control(
    id, real_enabled, authorized_session_id, authorization_expires_at,
    authorization_reason, updated_by, updated_at
  ) values (
    1, p_enabled, case when p_enabled then p_session_id end,
    case when p_enabled then p_expires_at end, left(btrim(p_reason),300),
    nullif(btrim(coalesce(p_updated_by,'')),''), now()
  ) on conflict (id) do update set
    real_enabled = excluded.real_enabled,
    authorized_session_id = excluded.authorized_session_id,
    authorization_expires_at = excluded.authorization_expires_at,
    authorization_reason = excluded.authorization_reason,
    updated_by = excluded.updated_by,
    updated_at = now();

  if not p_enabled then
    update public.whatsapp_campaigns set
      status = 'PAUSED_SYSTEM', paused_at = now(),
      system_pause_reason = 'RUNTIME_AUTHORIZATION_DISABLED',
      lifecycle_version = lifecycle_version + 1, updated_at = now()
    where status = 'RUNNING' and not dry_run;
  end if;

  return jsonb_build_object(
    'enabled', p_enabled,
    'sessionId', case when p_enabled then p_session_id end,
    'expiresAt', case when p_enabled then p_expires_at end
  );
end;
$$;

create or replace function public.claim_whatsapp_campaign_items(
  p_worker_id text,
  p_limit integer default 1,
  p_lease_seconds integer default 60
) returns setof public.whatsapp_campaign_queue
language plpgsql security invoker set search_path = public as $$
declare
  v_runtime public.whatsapp_dispatch_runtime_control%rowtype;
begin
  if nullif(btrim(p_worker_id), '') is null or p_limit <> 1
    or p_lease_seconds not between 15 and 900 then
    raise exception 'INVALID_CLAIM_ARGUMENTS';
  end if;

  select * into v_runtime from public.whatsapp_dispatch_runtime_control
    where id = 1 for update;
  if v_runtime.id is null or not v_runtime.real_enabled
    or v_runtime.authorized_session_id is null
    or v_runtime.authorization_expires_at is null
    or v_runtime.authorization_expires_at <= now()
    or not exists (
      select 1 from public.agent_autonomy_config a
      where a.id = 1 and not a.kill_switch and not a.outbound_kill_switch
    )
    or not exists (
      select 1 from public.whatsapp_sessions s
      where s.id = v_runtime.authorized_session_id and s.status = 'connected'
        and s.circuit_state = 'closed' and s.heartbeat_at is not null
        and s.heartbeat_at >= now() - interval '90 seconds'
    ) then
    return;
  end if;

  return query
  with candidates as (
    select q.id
    from public.whatsapp_campaign_queue q
    join public.whatsapp_campaigns c on c.id = q.campaign_id
    where not q.is_dry_run and not c.dry_run and c.status = 'RUNNING'
      and c.test_only and c.session_id = v_runtime.authorized_session_id
      and c.campaign_limit between 1 and 5
      and cardinality(c.test_client_ids) between 1 and 5
      and q.client_id = any(c.test_client_ids)
      and coalesce(c.next_batch_at, now()) <= now()
      and coalesce(c.next_send_at, now()) <= now()
      and q.status in ('QUEUED','WAITING','WAITING_LIMIT','WAITING_WINDOW','RETRY_WAIT')
      and q.next_send_at <= now() and coalesce(q.next_attempt_at, q.next_send_at) <= now()
      and not exists (
        select 1 from public.whatsapp_campaign_queue active
        where active.status in ('PROCESSING','SENDING_MEDIA','SENDING_TEXT')
          and active.lease_expires_at > now()
      )
    order by q.next_send_at, q.selection_order
    for update of q skip locked
    limit 1
  ), claimed as (
    update public.whatsapp_campaign_queue q
    set status = 'PROCESSING', worker_id = btrim(p_worker_id), claimed_at = now(),
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        attempt_count = attempt_count + 1,
        phase_authorization_token = null, phase_authorized_at = null,
        phase_authorization_expires_at = null,
        phase_authorized_lifecycle_version = null, updated_at = now()
    from candidates c where q.id = c.id
    returning q.*
  ), attempts as (
    insert into public.whatsapp_campaign_attempts(
      queue_id, attempt_number, worker_id, lease_expires_at
    ) select id, attempt_count, worker_id, lease_expires_at from claimed
    returning queue_id
  )
  select claimed.* from claimed join attempts on attempts.queue_id = claimed.id;
end;
$$;

create or replace function public.authorize_whatsapp_dispatch_phase(
  p_queue_id bigint,
  p_worker_id text,
  p_phase text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  q public.whatsapp_campaign_queue%rowtype;
  c public.whatsapp_campaigns%rowtype;
  v_client public.clients%rowtype;
  v_conversation public.whatsapp_conversations%rowtype;
  v_session public.whatsapp_sessions%rowtype;
  v_control public.agent_autonomy_config%rowtype;
  v_runtime public.whatsapp_dispatch_runtime_control%rowtype;
  v_phase text := upper(btrim(coalesce(p_phase,'')));
  v_status text;
  v_reason text;
  v_token uuid;
  v_authorization_expires timestamptz;
  v_local_time time;
  v_sent_hour integer;
  v_sent_day integer;
  v_sent_campaign integer;
begin
  if v_phase not in ('MEDIA','TEXT') then raise exception 'INVALID_DISPATCH_PHASE'; end if;

  select * into v_runtime from public.whatsapp_dispatch_runtime_control
    where id = 1 for update;
  select * into q from public.whatsapp_campaign_queue where id = p_queue_id for update;
  if not found then raise exception 'QUEUE_ITEM_NOT_FOUND'; end if;
  select * into c from public.whatsapp_campaigns where id = q.campaign_id for update;
  select * into v_client from public.clients where id = q.client_id;
  select * into v_conversation from public.whatsapp_conversations where id = q.conversation_id;
  select * into v_session from public.whatsapp_sessions where id = c.session_id;
  select * into v_control from public.agent_autonomy_config where id = 1;

  if q.worker_id is distinct from btrim(p_worker_id) or q.lease_expires_at is null
    or q.lease_expires_at <= now() then raise exception 'CLAIM_NOT_OWNED'; end if;
  if (v_phase = 'MEDIA' and (q.status <> 'PROCESSING' or q.media_id is null or q.media_version is null))
    or (v_phase = 'TEXT' and (
      (q.media_id is null and q.status <> 'PROCESSING')
      or (q.media_id is not null and q.status <> 'SENDING_MEDIA')
    )) then raise exception 'PHASE_TRANSITION_INVALID'; end if;

  v_local_time := (now() at time zone c.timezone)::time;
  select count(*) into v_sent_hour from public.whatsapp_campaign_queue
    where campaign_id = c.id and status = 'SENT' and provider_ack_at >= now() - interval '1 hour';
  select count(*) into v_sent_day from public.whatsapp_campaign_queue
    where campaign_id = c.id and status = 'SENT'
      and (provider_ack_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date;
  select count(*) into v_sent_campaign from public.whatsapp_campaign_queue
    where campaign_id = c.id and status = 'SENT';

  if c.status <> 'RUNNING' then v_reason := 'CAMPAIGN_NOT_RUNNING'; v_status := 'CANCELLED';
  elsif c.dry_run or not c.test_only or c.campaign_limit not between 1 and 5
    or cardinality(c.test_client_ids) not between 1 and 5
    or not coalesce(q.client_id = any(c.test_client_ids), false)
    then v_reason := 'REAL_TEST_SCOPE_REQUIRED'; v_status := 'BLOCKED';
  elsif v_runtime.id is null or not v_runtime.real_enabled
    or v_runtime.authorized_session_id is distinct from c.session_id
    or v_runtime.authorization_expires_at is null
    or v_runtime.authorization_expires_at <= now()
    then v_reason := 'RUNTIME_NOT_AUTHORIZED'; v_status := 'BLOCKED';
  elsif v_control.id is null or v_control.kill_switch or v_control.outbound_kill_switch
    then v_reason := 'KILL_SWITCH'; v_status := 'BLOCKED';
  elsif v_session.id is null or v_session.status <> 'connected'
    or v_session.circuit_state <> 'closed' or v_session.heartbeat_at is null
    or v_session.heartbeat_at < now() - interval '90 seconds'
    then v_reason := 'SESSION_UNHEALTHY'; v_status := 'BLOCKED';
  elsif v_client.id is null or not v_client.can_contact or v_client.do_not_contact
    or v_client.opt_out_at is not null
    then v_reason := 'CONTACT_BLOCKED'; v_status := 'BLOCKED';
  elsif v_conversation.id is null
    or nullif(regexp_replace(coalesce(q.phone_e164,''), '\\D', '', 'g'),'') is null
    or nullif(q.provider_identity,'') is null
    or v_conversation.client_id is distinct from q.client_id
    or v_conversation.session_id is distinct from c.session_id
    or regexp_replace(coalesce(v_conversation.phone_e164,''), '\\D', '', 'g')
      <> regexp_replace(coalesce(q.phone_e164,''), '\\D', '', 'g')
    or coalesce(v_conversation.provider_identity,'') <> coalesce(q.provider_identity,'')
    then v_reason := 'IDENTITY_MISMATCH'; v_status := 'BLOCKED';
  elsif v_conversation.control_mode <> 'auto'
    then v_reason := 'HUMAN_CONTROL'; v_status := 'BLOCKED';
  elsif v_conversation.last_inbound_at is not null
    and v_conversation.last_inbound_at > coalesce(q.last_inbound_seen_at, '-infinity'::timestamptz)
    then v_reason := 'CLIENT_REPLIED'; v_status := 'CANCELLED_REPLY';
  elsif v_local_time < c.allowed_start_time or v_local_time >= c.allowed_end_time
    then v_reason := 'OUTSIDE_WINDOW'; v_status := 'WAITING_WINDOW';
  elsif v_sent_hour >= c.hourly_limit or v_sent_day >= c.daily_limit
    or (c.campaign_limit is not null and v_sent_campaign >= c.campaign_limit)
    then v_reason := 'LIMIT_REACHED'; v_status := 'WAITING_LIMIT';
  elsif v_phase = 'TEXT' and q.media_id is not null and not exists (
    select 1 from public.whatsapp_campaign_item_deliveries d
    where d.queue_id = q.id and d.phase = 'MEDIA'
      and d.status in ('SERVER_ACK','DELIVERED','READ')
      and d.whatsapp_message_id is not null and d.read_back_at is not null
    ) then v_reason := 'MEDIA_ACK_READ_BACK_REQUIRED'; v_status := 'WAITING_RECONCILIATION';
  end if;

  if v_reason is not null then
    update public.whatsapp_campaign_queue set status = v_status, skip_reason = v_reason,
      worker_id = null, claimed_at = null, lease_expires_at = null,
      phase_authorization_token = null, phase_authorized_at = null,
      phase_authorization_expires_at = null,
      phase_authorized_lifecycle_version = null,
      next_send_at = case when v_status = 'WAITING_WINDOW' then
        (((now() at time zone c.timezone)::date
          + case when v_local_time >= c.allowed_end_time then 1 else 0 end)
          + c.allowed_start_time) at time zone c.timezone
        when v_status = 'WAITING_LIMIT' then now() + interval '1 hour' else next_send_at end,
      updated_at = now() where id = q.id;
    update public.whatsapp_campaign_attempts set outcome = 'BLOCKED',
      error_reason = v_reason, finished_at = now()
      where queue_id = q.id and attempt_number = q.attempt_count and phase = 'ITEM';
    if v_reason in ('RUNTIME_NOT_AUTHORIZED','KILL_SWITCH','SESSION_UNHEALTHY') then
      update public.whatsapp_campaigns set status = 'PAUSED_SYSTEM', paused_at = now(),
        system_pause_reason = v_reason, lifecycle_version = lifecycle_version + 1,
        updated_at = now() where id = c.id and status = 'RUNNING';
    end if;
    return jsonb_build_object('allowed',false,'status',v_status,'reason',v_reason);
  end if;

  v_token := gen_random_uuid();
  v_authorization_expires := least(q.lease_expires_at, now() + interval '60 seconds');
  insert into public.whatsapp_campaign_item_deliveries(queue_id,phase,status)
    values (q.id,v_phase,'PENDING') on conflict (queue_id,phase) do nothing;
  if not found then raise exception 'PHASE_ALREADY_ATTEMPTED'; end if;

  update public.whatsapp_campaign_queue set
    status = case when v_phase = 'MEDIA' then 'SENDING_MEDIA' else 'SENDING_TEXT' end,
    phase_authorization_token = v_token, phase_authorized_at = now(),
    phase_authorization_expires_at = v_authorization_expires,
    phase_authorized_lifecycle_version = c.lifecycle_version, updated_at = now()
    where id = q.id;

  return jsonb_build_object(
    'allowed',true,'queueId',q.id,'phase',v_phase,
    'authorizationToken',v_token,'lifecycleVersion',c.lifecycle_version,
    'expiresAt',v_authorization_expires
  );
end;
$$;

create or replace function public.renew_whatsapp_dispatch_claim(
  p_queue_id bigint, p_worker_id text, p_lease_seconds integer default 600
) returns timestamptz language plpgsql security invoker set search_path = public as $$
declare v_expires timestamptz;
begin
  if p_lease_seconds not between 15 and 900 then raise exception 'INVALID_LEASE_SECONDS'; end if;
  update public.whatsapp_campaign_queue set
    lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id = p_queue_id and status in ('PROCESSING','SENDING_MEDIA','SENDING_TEXT')
    and worker_id = btrim(p_worker_id) and lease_expires_at > now()
  returning lease_expires_at into v_expires;
  if v_expires is null then raise exception 'CLAIM_NOT_OWNED'; end if;
  return v_expires;
end;
$$;

create or replace function public.record_whatsapp_dispatch_authorized_ack(
  p_queue_id bigint,
  p_worker_id text,
  p_phase text,
  p_authorization_token uuid,
  p_provider_message_id text,
  p_ack_level text,
  p_whatsapp_message_id bigint default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  q public.whatsapp_campaign_queue%rowtype;
  v_phase text := upper(btrim(coalesce(p_phase,'')));
  v_level text := upper(btrim(coalesce(p_ack_level,'')));
begin
  select * into q from public.whatsapp_campaign_queue where id = p_queue_id for update;
  if not found or q.worker_id is distinct from btrim(p_worker_id)
    or q.lease_expires_at <= now() or q.phase_authorization_token is distinct from p_authorization_token
    or q.status <> (case when v_phase = 'MEDIA' then 'SENDING_MEDIA' else 'SENDING_TEXT' end)
    then raise exception 'PHASE_AUTHORIZATION_NOT_OWNED'; end if;
  if v_phase not in ('MEDIA','TEXT') or v_level not in
    ('ACCEPTED','SERVER_ACK','DELIVERED','READ','FAILED','UNKNOWN_ACCEPTANCE')
    or nullif(btrim(p_provider_message_id),'') is null then raise exception 'INVALID_ACK'; end if;
  if q.phase_authorization_expires_at <= now() and not exists (
    select 1 from public.whatsapp_campaign_item_deliveries d
    where d.queue_id = q.id and d.phase = v_phase
      and d.provider_message_id = p_provider_message_id
  ) then raise exception 'PHASE_AUTHORIZATION_EXPIRED'; end if;
  if p_whatsapp_message_id is not null and not exists (
    select 1 from public.whatsapp_messages m where m.id = p_whatsapp_message_id
      and m.provider_message_id = p_provider_message_id and m.client_id = q.client_id
      and m.conversation_id = q.conversation_id and m.direction = 'outbound'
  ) then raise exception 'MESSAGE_READ_BACK_MISMATCH'; end if;
  if exists (
    select 1 from public.whatsapp_campaign_item_deliveries
    where queue_id = q.id and phase = v_phase and provider_message_id is not null
      and provider_message_id is distinct from p_provider_message_id
  ) then raise exception 'PROVIDER_MESSAGE_ID_IMMUTABLE'; end if;

  insert into public.whatsapp_campaign_item_deliveries(
    queue_id,phase,status,provider_message_id,whatsapp_message_id,
    accepted_at,server_ack_at,delivered_at,read_at,read_back_at,last_error
  ) values (
    q.id,v_phase,v_level,p_provider_message_id,p_whatsapp_message_id,
    case when v_level in ('ACCEPTED','SERVER_ACK','DELIVERED','READ') then now() end,
    case when v_level in ('SERVER_ACK','DELIVERED','READ') then now() end,
    case when v_level in ('DELIVERED','READ') then now() end,
    case when v_level = 'READ' then now() end,
    case when p_whatsapp_message_id is not null then now() end,
    case when v_level = 'FAILED' then 'PROVIDER_FAILED'
      when v_level = 'UNKNOWN_ACCEPTANCE' then 'PROVIDER_ACCEPTANCE_UNKNOWN' end
  ) on conflict (queue_id,phase) do update set
    status = case
      when excluded.status in ('FAILED','UNKNOWN_ACCEPTANCE') then excluded.status
      when whatsapp_campaign_item_deliveries.status in ('FAILED','UNKNOWN_ACCEPTANCE')
        then whatsapp_campaign_item_deliveries.status
      when array_position(array['PENDING','ACCEPTED','SERVER_ACK','DELIVERED','READ']::text[], excluded.status)
        >= array_position(array['PENDING','ACCEPTED','SERVER_ACK','DELIVERED','READ']::text[], whatsapp_campaign_item_deliveries.status)
        then excluded.status else whatsapp_campaign_item_deliveries.status end,
    provider_message_id = excluded.provider_message_id,
    whatsapp_message_id = coalesce(excluded.whatsapp_message_id,whatsapp_campaign_item_deliveries.whatsapp_message_id),
    accepted_at = coalesce(whatsapp_campaign_item_deliveries.accepted_at,excluded.accepted_at),
    server_ack_at = coalesce(whatsapp_campaign_item_deliveries.server_ack_at,excluded.server_ack_at),
    delivered_at = coalesce(whatsapp_campaign_item_deliveries.delivered_at,excluded.delivered_at),
    read_at = coalesce(whatsapp_campaign_item_deliveries.read_at,excluded.read_at),
    read_back_at = coalesce(whatsapp_campaign_item_deliveries.read_back_at,excluded.read_back_at),
    last_error = excluded.last_error, updated_at = now();
  return jsonb_build_object('recorded',true,'queueId',q.id,'phase',v_phase,'ack',v_level);
end;
$$;

create or replace function public.retry_or_fail_whatsapp_dispatch_item(
  p_queue_id bigint, p_worker_id text, p_reason text, p_acceptance_unknown boolean default false
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  q public.whatsapp_campaign_queue%rowtype;
  c public.whatsapp_campaigns%rowtype;
  v_status text;
  v_next timestamptz;
begin
  select * into q from public.whatsapp_campaign_queue where id = p_queue_id for update;
  if not found or q.status not in ('PROCESSING','SENDING_MEDIA','SENDING_TEXT')
    or q.worker_id is distinct from btrim(p_worker_id) or q.lease_expires_at <= now()
    then raise exception 'CLAIM_NOT_OWNED'; end if;
  select * into c from public.whatsapp_campaigns where id = q.campaign_id;
  if nullif(btrim(p_reason),'') is null then raise exception 'RETRY_REASON_REQUIRED'; end if;
  if q.status in ('SENDING_MEDIA','SENDING_TEXT') or p_acceptance_unknown or exists (
    select 1 from public.whatsapp_campaign_item_deliveries where queue_id = q.id
      and status in ('PENDING','ACCEPTED','SERVER_ACK','DELIVERED','READ','UNKNOWN_ACCEPTANCE')
  ) then v_status := 'WAITING_RECONCILIATION';
  elsif q.attempt_count >= c.max_attempts then v_status := 'FAILED';
  else
    v_status := 'RETRY_WAIT';
    v_next := now() + make_interval(secs => least(86400,
      (c.retry_delay_seconds * power(c.retry_backoff_multiplier,greatest(q.attempt_count - 1,0)))::integer));
  end if;
  update public.whatsapp_campaign_queue set status = v_status, next_attempt_at = v_next,
    last_error = left(btrim(p_reason),300), worker_id = null, claimed_at = null,
    lease_expires_at = null, phase_authorization_token = null, phase_authorized_at = null,
    phase_authorization_expires_at = null, phase_authorized_lifecycle_version = null,
    updated_at = now() where id = q.id;
  update public.whatsapp_campaign_attempts set outcome = case
      when v_status = 'RETRY_WAIT' then 'RETRY'
      when v_status = 'WAITING_RECONCILIATION' then 'UNKNOWN_ACCEPTANCE' else 'FAILED' end,
    error_reason = left(btrim(p_reason),300), finished_at = now()
    where queue_id = q.id and attempt_number = q.attempt_count and phase = 'ITEM';
  return jsonb_build_object('queueId',q.id,'status',v_status,'nextAttemptAt',v_next);
end;
$$;

create or replace function public.recover_expired_whatsapp_claims()
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_requeued integer; v_uncertain integer;
begin
  with uncertain as (
    update public.whatsapp_campaign_queue q set
      status = 'WAITING_RECONCILIATION', worker_id = null, claimed_at = null,
      lease_expires_at = null, phase_authorization_token = null, phase_authorized_at = null,
      phase_authorization_expires_at = null, phase_authorized_lifecycle_version = null,
      last_error = 'LEASE_EXPIRED_DURING_SENDING_PHASE', updated_at = now()
    where q.status in ('SENDING_MEDIA','SENDING_TEXT') and q.lease_expires_at <= now()
    returning q.id,q.attempt_count
  ), attempts as (
    update public.whatsapp_campaign_attempts a set outcome = 'UNKNOWN_ACCEPTANCE',
      error_reason = 'LEASE_EXPIRED_DURING_SENDING_PHASE', finished_at = now()
    from uncertain u where a.queue_id = u.id and a.attempt_number = u.attempt_count
      and a.phase = 'ITEM' returning a.id
  ) select count(*) into v_uncertain from uncertain;

  with accepted as (
    update public.whatsapp_campaign_queue q set
      status = 'WAITING_RECONCILIATION', worker_id = null, claimed_at = null,
      lease_expires_at = null, phase_authorization_token = null, phase_authorized_at = null,
      phase_authorization_expires_at = null, phase_authorized_lifecycle_version = null,
      last_error = 'LEASE_EXPIRED_AFTER_PROVIDER_ACCEPTANCE', updated_at = now()
    where q.status = 'PROCESSING' and q.lease_expires_at <= now()
      and exists (select 1 from public.whatsapp_campaign_item_deliveries d
        where d.queue_id = q.id and d.status in
          ('PENDING','ACCEPTED','SERVER_ACK','DELIVERED','READ','UNKNOWN_ACCEPTANCE'))
    returning q.id,q.attempt_count
  ), attempts as (
    update public.whatsapp_campaign_attempts a set outcome = 'UNKNOWN_ACCEPTANCE',
      error_reason = 'LEASE_EXPIRED_AFTER_PROVIDER_ACCEPTANCE', finished_at = now()
    from accepted u where a.queue_id = u.id and a.attempt_number = u.attempt_count
      and a.phase = 'ITEM' returning a.id
  ) select v_uncertain + count(*) into v_uncertain from accepted;

  with expired as (
    update public.whatsapp_campaign_queue q set
      status = case when q.attempt_count >= c.max_attempts then 'FAILED' else 'RETRY_WAIT' end,
      worker_id = null, claimed_at = null, lease_expires_at = null,
      phase_authorization_token = null, phase_authorized_at = null,
      phase_authorization_expires_at = null, phase_authorized_lifecycle_version = null,
      next_attempt_at = case when q.attempt_count >= c.max_attempts then q.next_attempt_at else
        now() + make_interval(secs => least(86400,
          (c.retry_delay_seconds * power(c.retry_backoff_multiplier,greatest(q.attempt_count - 1,0)))::integer)) end,
      last_error = 'LEASE_EXPIRED', updated_at = now()
    from public.whatsapp_campaigns c
    where q.campaign_id = c.id and q.status = 'PROCESSING' and q.lease_expires_at <= now()
    returning q.id
  ) select count(*) into v_requeued from expired;
  return jsonb_build_object('requeuedOrFailed',v_requeued,'reconciliationRequired',v_uncertain);
end;
$$;

create or replace function public.finalize_whatsapp_dispatch_item(
  p_queue_id bigint, p_worker_id text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  q public.whatsapp_campaign_queue%rowtype;
  c public.whatsapp_campaigns%rowtype;
  v_text public.whatsapp_campaign_item_deliveries%rowtype;
  v_interval integer;
  v_boundary boolean;
begin
  select * into q from public.whatsapp_campaign_queue where id = p_queue_id for update;
  if not found or q.status <> 'SENDING_TEXT'
    or q.worker_id is distinct from btrim(p_worker_id) or q.lease_expires_at <= now()
    then raise exception 'CLAIM_NOT_OWNED'; end if;
  select * into c from public.whatsapp_campaigns where id = q.campaign_id for update;
  select * into v_text from public.whatsapp_campaign_item_deliveries
    where queue_id = q.id and phase = 'TEXT';
  if v_text.id is null or v_text.status not in ('SERVER_ACK','DELIVERED','READ')
    or v_text.whatsapp_message_id is null or v_text.read_back_at is null
    then raise exception 'TEXT_ACK_READ_BACK_REQUIRED'; end if;
  if q.media_id is not null and not exists (
    select 1 from public.whatsapp_campaign_item_deliveries where queue_id = q.id and phase = 'MEDIA'
      and status in ('SERVER_ACK','DELIVERED','READ')
      and whatsapp_message_id is not null and read_back_at is not null
  ) then raise exception 'MEDIA_ACK_READ_BACK_REQUIRED'; end if;

  update public.whatsapp_campaign_queue set status = 'SENT',
    whatsapp_message_id = v_text.whatsapp_message_id, provider_ack_at = v_text.server_ack_at,
    read_back_at = v_text.read_back_at, worker_id = null, claimed_at = null,
    lease_expires_at = null, phase_authorization_token = null, phase_authorized_at = null,
    phase_authorization_expires_at = null, phase_authorized_lifecycle_version = null,
    updated_at = now() where id = q.id;
  update public.whatsapp_campaign_attempts set outcome = 'SENT', finished_at = now()
    where queue_id = q.id and attempt_number = q.attempt_count and phase = 'ITEM';

  v_boundary := c.batch_sent_count + 1 >= c.batch_size;
  v_interval := c.message_interval_min_seconds +
    mod(abs(hashtextextended(q.id::text || ':' || q.attempt_count::text,0)),
      (c.message_interval_max_seconds - c.message_interval_min_seconds + 1)::bigint)::integer;
  update public.whatsapp_campaigns set
    current_batch = current_batch + case when v_boundary then 1 else 0 end,
    batch_sent_count = case when v_boundary then 0 else batch_sent_count + 1 end,
    last_batch_at = case when v_boundary then now() else last_batch_at end,
    next_batch_at = case when v_boundary then now() + make_interval(secs => batch_pause_seconds) else next_batch_at end,
    next_send_at = now() + make_interval(secs => v_interval), updated_at = now()
    where id = c.id;
  return jsonb_build_object('sent',true,'queueId',q.id,'providerMessageId',v_text.provider_message_id);
end;
$$;

create or replace function public.transition_whatsapp_campaign(
  p_campaign_id uuid, p_action text, p_reason text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_campaign public.whatsapp_campaigns%rowtype;
  v_runtime public.whatsapp_dispatch_runtime_control%rowtype;
  v_session public.whatsapp_sessions%rowtype;
  v_control public.agent_autonomy_config%rowtype;
  v_action text := upper(btrim(coalesce(p_action,'')));
  v_target text;
  v_event text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,0));
  select * into v_runtime from public.whatsapp_dispatch_runtime_control where id = 1 for update;
  select * into v_campaign from public.whatsapp_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_action = 'ACTIVATE' then
    v_target := 'READY'; v_event := 'CAMPAIGN_ACTIVATED';
    if v_campaign.status not in ('OFF','READY') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
    if not exists (select 1 from public.whatsapp_campaign_templates where campaign_id = p_campaign_id)
      then raise exception 'CAMPAIGN_HAS_NO_TEMPLATES'; end if;
    if exists (
      select 1 from public.whatsapp_campaign_templates ct
      join public.whatsapp_templates t on t.id = ct.template_id
      join public.whatsapp_template_versions tv
        on tv.template_id = ct.template_id and tv.version = ct.template_version
      left join public.whatsapp_dispatch_media m
        on m.id = tv.media_id and m.version = tv.media_version
      where ct.campaign_id = p_campaign_id and (
        t.approach_id <> v_campaign.approach_id or not t.active or not tv.active
        or (tv.media_id is not null and (m.id is null or not m.active))
      )
    ) then raise exception 'CAMPAIGN_TEMPLATE_APPROACH_MISMATCH'; end if;
    if exists (
      select 1 from public.whatsapp_approaches a where a.id = v_campaign.approach_id
        and (not a.active or (a.cadence_id is not null and a.cadence_id <> v_campaign.cadence_id))
    ) then raise exception 'CAMPAIGN_APPROACH_CONFIGURATION_MISMATCH'; end if;
    if v_campaign.distribution_strategy = 'WEIGHTED' and (
      select coalesce(sum(weight),0) from public.whatsapp_campaign_templates
      where campaign_id = p_campaign_id
    ) <> 100 then raise exception 'CAMPAIGN_WEIGHTS_MUST_TOTAL_100'; end if;
  elsif v_action = 'START' then
    v_target := 'RUNNING'; v_event := 'CAMPAIGN_STARTED';
    if v_campaign.status not in ('READY','RUNNING') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
    if not v_campaign.dry_run and (
      not v_campaign.test_only or v_campaign.session_id is null
      or v_campaign.campaign_limit is null or v_campaign.campaign_limit > 5
      or cardinality(v_campaign.test_client_ids) not between 1 and 5
    ) then raise exception 'REAL_DISPATCH_REQUIRES_TEST_SCOPE'; end if;
  elsif v_action = 'PAUSE' then
    v_target := 'PAUSED'; v_event := 'CAMPAIGN_PAUSED';
    if v_campaign.status not in ('RUNNING','PAUSED') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
  elsif v_action = 'RESUME' then
    v_target := 'RUNNING'; v_event := 'CAMPAIGN_RESUMED';
    if v_campaign.status not in ('PAUSED','PAUSED_SYSTEM','RUNNING')
      then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
  elsif v_action = 'STOP' then
    v_target := 'STOPPED'; v_event := 'CAMPAIGN_STOPPED';
    if v_campaign.status = 'STOPPED' then
      return jsonb_build_object('campaignId',p_campaign_id,'status','STOPPED','changed',false);
    end if;
  else raise exception 'INVALID_CAMPAIGN_ACTION';
  end if;

  if v_target = 'RUNNING' and not v_campaign.dry_run then
    if v_runtime.id is null or not v_runtime.real_enabled
      or v_runtime.authorized_session_id is distinct from v_campaign.session_id
      or v_runtime.authorization_expires_at is null
      or v_runtime.authorization_expires_at <= now()
      then raise exception 'REAL_DISPATCH_RUNTIME_NOT_AUTHORIZED'; end if;
    select * into v_control from public.agent_autonomy_config where id = 1;
    if v_control.id is null or v_control.kill_switch or v_control.outbound_kill_switch
      then raise exception 'REAL_DISPATCH_KILL_SWITCH_ACTIVE'; end if;
    select * into v_session from public.whatsapp_sessions where id = v_campaign.session_id;
    if v_session.id is null or v_session.status <> 'connected'
      or v_session.circuit_state <> 'closed' or v_session.heartbeat_at is null
      or v_session.heartbeat_at < now() - interval '90 seconds'
      then raise exception 'REAL_DISPATCH_SESSION_UNHEALTHY'; end if;
  end if;

  if v_campaign.status = v_target then
    return jsonb_build_object('campaignId',p_campaign_id,'status',v_target,'changed',false);
  end if;
  update public.whatsapp_campaigns set status = v_target,
    lifecycle_version = lifecycle_version + 1,
    started_at = case when v_action = 'START' then coalesce(started_at,now()) else started_at end,
    paused_at = case when v_action = 'PAUSE' then now()
      when v_action = 'RESUME' then null else paused_at end,
    finished_at = case when v_action = 'STOP' then now() else finished_at end,
    stop_reason = case when v_action = 'STOP' then nullif(btrim(p_reason),'') else stop_reason end,
    system_pause_reason = case when v_action = 'RESUME' then null else system_pause_reason end,
    updated_at = now() where id = p_campaign_id returning * into v_campaign;
  if v_action = 'STOP' then
    update public.whatsapp_campaign_queue set status = 'CANCELLED',
      worker_id = null, claimed_at = null, lease_expires_at = null,
      phase_authorization_token = null, phase_authorized_at = null,
      phase_authorization_expires_at = null,
      phase_authorized_lifecycle_version = null, updated_at = now()
      where campaign_id = p_campaign_id and status in
        ('QUEUED','WAITING','WAITING_LIMIT','WAITING_WINDOW','RETRY_WAIT','PROCESSING');
    update public.client_cadence_state set status = 'CANCELLED', next_due_at = null, updated_at = now()
      where campaign_id = p_campaign_id and status in ('ACTIVE','PAUSED');
  end if;
  insert into public.agent_events(entity_type,entity_id,event_type,payload,idempotency_key,actor_type)
    values ('whatsapp_campaign',p_campaign_id::text,v_event,
      jsonb_build_object('status',v_target,'reason',p_reason,'lifecycleVersion',v_campaign.lifecycle_version),
      format('whatsapp-campaign:%s:lifecycle:%s:%s',p_campaign_id,v_campaign.lifecycle_version,v_action),'operator')
    on conflict do nothing;
  return jsonb_build_object('campaignId',p_campaign_id,'status',v_target,'changed',true);
end;
$$;

revoke execute on function public.record_whatsapp_dispatch_ack(bigint,text,text,text,text,bigint)
  from public, anon, authenticated, service_role;
revoke execute on function public.configure_whatsapp_dispatch_runtime(boolean,uuid,timestamptz,text,text),
  public.enforce_whatsapp_dispatch_queue_test_scope(),
  public.enforce_whatsapp_campaign_test_scope_immutability(),
  public.claim_whatsapp_campaign_items(text,integer,integer),
  public.authorize_whatsapp_dispatch_phase(bigint,text,text),
  public.renew_whatsapp_dispatch_claim(bigint,text,integer),
  public.record_whatsapp_dispatch_authorized_ack(bigint,text,text,uuid,text,text,bigint),
  public.retry_or_fail_whatsapp_dispatch_item(bigint,text,text,boolean),
  public.recover_expired_whatsapp_claims(),
  public.finalize_whatsapp_dispatch_item(bigint,text),
  public.transition_whatsapp_campaign(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.configure_whatsapp_dispatch_runtime(boolean,uuid,timestamptz,text,text),
  public.enforce_whatsapp_dispatch_queue_test_scope(),
  public.enforce_whatsapp_campaign_test_scope_immutability(),
  public.claim_whatsapp_campaign_items(text,integer,integer),
  public.authorize_whatsapp_dispatch_phase(bigint,text,text),
  public.renew_whatsapp_dispatch_claim(bigint,text,integer),
  public.record_whatsapp_dispatch_authorized_ack(bigint,text,text,uuid,text,text,bigint),
  public.retry_or_fail_whatsapp_dispatch_item(bigint,text,text,boolean),
  public.recover_expired_whatsapp_claims(),
  public.finalize_whatsapp_dispatch_item(bigint,text),
  public.transition_whatsapp_campaign(uuid,text,text)
  to service_role;
