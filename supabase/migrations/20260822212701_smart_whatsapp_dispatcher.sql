create table public.whatsapp_cadences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index whatsapp_cadences_name_key on public.whatsapp_cadences(lower(btrim(name)));

create table public.whatsapp_cadence_steps (
  id uuid primary key default gen_random_uuid(),
  cadence_id uuid not null references public.whatsapp_cadences(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  step_key text not null check (btrim(step_key) <> ''),
  day_offset integer not null check (day_offset >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cadence_id, step_order),
  unique (cadence_id, step_key),
  unique (id, cadence_id)
);
create index whatsapp_cadence_steps_cadence_idx
  on public.whatsapp_cadence_steps(cadence_id, active, step_order);

create table public.whatsapp_dispatch_media (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  version integer not null check (version > 0),
  media_type text not null check (media_type in ('IMAGE','VIDEO','DOCUMENT')),
  storage_path text not null check (btrim(storage_path) <> ''),
  mime_type text not null check (btrim(mime_type) <> ''),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, version)
);
create unique index whatsapp_dispatch_media_name_version_key
  on public.whatsapp_dispatch_media(lower(btrim(name)), version);

create table public.whatsapp_approaches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  objective text not null check (btrim(objective) <> ''),
  project_id bigint references public.projects(id) on delete restrict,
  base_id bigint references public.lead_imports(id) on delete restrict,
  origin text,
  journey_stage text,
  cadence_id uuid references public.whatsapp_cadences(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index whatsapp_approaches_name_key on public.whatsapp_approaches(lower(btrim(name)));
create index whatsapp_approaches_project_idx on public.whatsapp_approaches(project_id) where project_id is not null;
create index whatsapp_approaches_base_idx on public.whatsapp_approaches(base_id) where base_id is not null;
create index whatsapp_approaches_cadence_idx on public.whatsapp_approaches(cadence_id) where cadence_id is not null;

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  approach_id uuid not null references public.whatsapp_approaches(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (approach_id, name)
);
create index whatsapp_templates_approach_idx on public.whatsapp_templates(approach_id, active);

create table public.whatsapp_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.whatsapp_templates(id) on delete cascade,
  version integer not null check (version > 0),
  body text not null check (btrim(body) <> ''),
  placeholders text[] not null default '{}',
  media_id uuid,
  media_version integer,
  media_order text not null default 'MEDIA_THEN_TEXT'
    check (media_order in ('MEDIA_THEN_TEXT','TEXT_THEN_MEDIA')),
  media_failure_policy text not null default 'STOP'
    check (media_failure_policy in ('STOP','SKIP_MEDIA_AND_SEND_TEXT','RETRY_MEDIA')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, version),
  unique (id, template_id, version),
  check (placeholders <@ array['nome','primeiro_nome','empreendimento','corretor','base']::text[]),
  check ((media_id is null and media_version is null) or (media_id is not null and media_version > 0)),
  foreign key (media_id, media_version)
    references public.whatsapp_dispatch_media(id, version) on delete restrict
);
create index whatsapp_template_versions_template_idx
  on public.whatsapp_template_versions(template_id, active, version desc);
create index whatsapp_template_versions_media_idx
  on public.whatsapp_template_versions(media_id) where media_id is not null;

create table public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  source text not null check (source in (
    'DAILY_WALLET','OWN_DATABASE','DNA','INDICATION','MANUAL_LIST',
    'PROJECT_LIST','REACTIVATION','CUSTOM'
  )),
  base_id bigint references public.lead_imports(id) on delete restrict,
  project_id bigint references public.projects(id) on delete restrict,
  approach_id uuid not null references public.whatsapp_approaches(id) on delete restrict,
  cadence_id uuid not null references public.whatsapp_cadences(id) on delete restrict,
  session_id uuid references public.whatsapp_sessions(id) on delete restrict,
  status text not null default 'OFF'
    check (status in ('OFF','READY','RUNNING','PAUSED','STOPPED','ERROR')),
  distribution_strategy text not null default 'ROUND_ROBIN'
    check (distribution_strategy in ('ROUND_ROBIN','RANDOM','WEIGHTED')),
  batch_size integer not null check (batch_size between 1 and 1000),
  message_interval_min_seconds integer not null check (message_interval_min_seconds >= 1),
  message_interval_max_seconds integer not null check (
    message_interval_max_seconds >= message_interval_min_seconds
    and message_interval_max_seconds <= 86400
  ),
  batch_pause_seconds integer not null check (batch_pause_seconds >= 0),
  hourly_limit integer not null check (hourly_limit > 0),
  daily_limit integer not null check (daily_limit > 0 and daily_limit >= hourly_limit),
  campaign_limit integer check (campaign_limit is null or campaign_limit > 0),
  allowed_start_time time not null,
  allowed_end_time time not null,
  timezone text not null default 'America/Sao_Paulo' check (btrim(timezone) <> ''),
  stop_on_reply boolean not null default true,
  dry_run boolean not null default true,
  lifecycle_version integer not null default 0 check (lifecycle_version >= 0),
  started_at timestamptz,
  paused_at timestamptz,
  finished_at timestamptz,
  stop_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allowed_start_time < allowed_end_time),
  check (status <> 'PAUSED' or paused_at is not null),
  check (status <> 'STOPPED' or finished_at is not null)
);
create index whatsapp_campaigns_status_idx on public.whatsapp_campaigns(status, created_at desc);
create index whatsapp_campaigns_base_idx on public.whatsapp_campaigns(base_id) where base_id is not null;
create index whatsapp_campaigns_project_idx on public.whatsapp_campaigns(project_id) where project_id is not null;
create index whatsapp_campaigns_approach_idx on public.whatsapp_campaigns(approach_id);
create index whatsapp_campaigns_cadence_idx on public.whatsapp_campaigns(cadence_id);
create index whatsapp_campaigns_session_idx on public.whatsapp_campaigns(session_id) where session_id is not null;

create table public.whatsapp_campaign_templates (
  campaign_id uuid not null references public.whatsapp_campaigns(id) on delete cascade,
  template_id uuid not null,
  template_version integer not null check (template_version > 0),
  position integer not null check (position > 0),
  weight numeric(5,2) not null default 100 check (weight > 0 and weight <= 100),
  created_at timestamptz not null default now(),
  primary key (campaign_id, template_id, template_version),
  unique (campaign_id, position),
  foreign key (template_id, template_version)
    references public.whatsapp_template_versions(template_id, version) on delete restrict
);
create index whatsapp_campaign_templates_template_idx
  on public.whatsapp_campaign_templates(template_id, template_version);

create table public.whatsapp_campaign_queue (
  id bigint generated by default as identity primary key,
  campaign_id uuid not null references public.whatsapp_campaigns(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  cadence_step_id uuid not null,
  cadence_id uuid not null,
  template_id uuid not null,
  template_version integer not null check (template_version > 0),
  media_id uuid,
  media_version integer,
  selection_order integer not null check (selection_order > 0),
  status text not null default 'QUEUED' check (status in (
    'QUEUED','WAITING','SENDING_MEDIA','SENDING_TEXT','SENT','FAILED',
    'SKIPPED','CANCELLED','REPLIED'
  )),
  is_dry_run boolean not null,
  scheduled_for timestamptz not null,
  idempotency_key text not null unique check (length(btrim(idempotency_key)) >= 16),
  skip_reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  whatsapp_message_id bigint references public.whatsapp_messages(id) on delete set null,
  provider_ack_at timestamptz,
  read_back_at timestamptz,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cadence_step_id, cadence_id)
    references public.whatsapp_cadence_steps(id, cadence_id) on delete restrict,
  foreign key (template_id, template_version)
    references public.whatsapp_template_versions(template_id, version) on delete restrict,
  foreign key (media_id, media_version)
    references public.whatsapp_dispatch_media(id, version) on delete restrict,
  unique nulls not distinct (
    campaign_id, client_id, cadence_step_id, template_id, template_version,
    media_id, media_version
  ),
  check ((media_id is null and media_version is null) or (media_id is not null and media_version > 0)),
  check (not is_dry_run or status in ('QUEUED','SKIPPED','CANCELLED','REPLIED')),
  check (status <> 'SKIPPED' or skip_reason is not null),
  check (status <> 'FAILED' or last_error is not null),
  check (status <> 'SENT' or (
    whatsapp_message_id is not null and provider_ack_at is not null and read_back_at is not null
  ))
);
create unique index whatsapp_campaign_queue_order_key
  on public.whatsapp_campaign_queue(campaign_id, selection_order, cadence_step_id);
create index whatsapp_campaign_queue_worker_idx
  on public.whatsapp_campaign_queue(campaign_id, status, scheduled_for, selection_order)
  where not is_dry_run and status in ('QUEUED','WAITING');
create index whatsapp_campaign_queue_client_idx
  on public.whatsapp_campaign_queue(client_id, created_at desc);
create index whatsapp_campaign_queue_step_idx on public.whatsapp_campaign_queue(cadence_step_id);
create index whatsapp_campaign_queue_template_idx
  on public.whatsapp_campaign_queue(template_id, template_version);
create index whatsapp_campaign_queue_media_idx
  on public.whatsapp_campaign_queue(media_id) where media_id is not null;
create index whatsapp_campaign_queue_message_idx
  on public.whatsapp_campaign_queue(whatsapp_message_id) where whatsapp_message_id is not null;

create table public.client_cadence_state (
  id bigint generated by default as identity primary key,
  campaign_id uuid not null references public.whatsapp_campaigns(id) on delete cascade,
  client_id bigint not null references public.clients(id) on delete cascade,
  cadence_id uuid not null references public.whatsapp_cadences(id) on delete restrict,
  current_step_id uuid,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','PAUSED','RESPONDED','COMPLETED','CANCELLED')),
  next_due_at timestamptz,
  last_sent_at timestamptz,
  replied_at timestamptz,
  reply_message_id bigint references public.whatsapp_messages(id) on delete set null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, client_id),
  foreign key (current_step_id, cadence_id)
    references public.whatsapp_cadence_steps(id, cadence_id) on delete restrict,
  check (status <> 'RESPONDED' or (replied_at is not null and reply_message_id is not null))
);
create index client_cadence_state_client_idx on public.client_cadence_state(client_id, updated_at desc);
create index client_cadence_state_cadence_idx on public.client_cadence_state(cadence_id);
create index client_cadence_state_step_idx on public.client_cadence_state(current_step_id) where current_step_id is not null;
create index client_cadence_state_reply_idx on public.client_cadence_state(reply_message_id) where reply_message_id is not null;

create table public.crm_labels (
  id uuid primary key default gen_random_uuid(),
  dimension text not null check (dimension in (
    'CADENCE','OPERATIONAL'
  )),
  key text not null check (key ~ '^[A-Z0-9_:-]+$'),
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (dimension, key)
);

create table public.client_labels (
  id bigint generated by default as identity primary key,
  client_id bigint not null references public.clients(id) on delete cascade,
  label_id uuid not null references public.crm_labels(id) on delete restrict,
  campaign_id uuid references public.whatsapp_campaigns(id) on delete set null,
  source text not null default 'SYSTEM' check (source in ('SYSTEM','CAMPAIGN','MANUAL')),
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  check (removed_at is null or removed_at >= assigned_at)
);
create unique index client_labels_active_key
  on public.client_labels(client_id, label_id) where removed_at is null;
create index client_labels_label_idx on public.client_labels(label_id, assigned_at desc);
create index client_labels_campaign_idx on public.client_labels(campaign_id) where campaign_id is not null;

insert into public.crm_labels(dimension, key, name)
values
  ('CADENCE','PAUSED','CADÊNCIA — PAUSADA'),
  ('CADENCE','RESPONDED','CADÊNCIA — RESPONDEU'),
  ('CADENCE','ENDED','CADÊNCIA — ENCERRADA'),
  ('OPERATIONAL','AWAITING_CLIENT_REPLY','AGUARDANDO RESPOSTA DO CLIENTE'),
  ('OPERATIONAL','OWED_CLIENT_REPLY','DEVENDO RETORNO AO CLIENTE')
on conflict (dimension, key) do nothing;

create or replace function public.log_whatsapp_campaign_created()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.agent_events(
    entity_type, entity_id, event_type, payload, idempotency_key, actor_type
  ) values (
    'whatsapp_campaign', new.id::text, 'CAMPAIGN_CREATED',
    jsonb_build_object('name', new.name, 'dryRun', new.dry_run, 'status', new.status),
    'whatsapp-campaign:' || new.id::text || ':created', 'operator'
  ) on conflict do nothing;
  return new;
end;
$$;
create trigger whatsapp_campaign_created_event
after insert on public.whatsapp_campaigns
for each row execute function public.log_whatsapp_campaign_created();

create or replace function public.transition_whatsapp_campaign(
  p_campaign_id uuid,
  p_action text,
  p_reason text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_campaign public.whatsapp_campaigns%rowtype;
  v_action text := upper(btrim(coalesce(p_action, '')));
  v_target text;
  v_event text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text, 0));
  select * into v_campaign from public.whatsapp_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;

  if v_action = 'ACTIVATE' then
    v_target := 'READY'; v_event := 'CAMPAIGN_ACTIVATED';
    if v_campaign.status not in ('OFF','READY') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
    if not exists (select 1 from public.whatsapp_campaign_templates where campaign_id = p_campaign_id) then
      raise exception 'CAMPAIGN_HAS_NO_TEMPLATES';
    end if;
    if exists (
      select 1
      from public.whatsapp_campaign_templates ct
      join public.whatsapp_templates t on t.id = ct.template_id
      join public.whatsapp_template_versions tv
        on tv.template_id = ct.template_id and tv.version = ct.template_version
      left join public.whatsapp_dispatch_media m
        on m.id = tv.media_id and m.version = tv.media_version
      where ct.campaign_id = p_campaign_id
        and (
          t.approach_id <> v_campaign.approach_id
          or not t.active
          or not tv.active
          or (tv.media_id is not null and (m.id is null or not m.active))
        )
    ) then raise exception 'CAMPAIGN_TEMPLATE_APPROACH_MISMATCH'; end if;
    if exists (
      select 1 from public.whatsapp_approaches a
      where a.id = v_campaign.approach_id
        and (not a.active or (a.cadence_id is not null and a.cadence_id <> v_campaign.cadence_id))
    ) then raise exception 'CAMPAIGN_APPROACH_CONFIGURATION_MISMATCH'; end if;
    if v_campaign.distribution_strategy = 'WEIGHTED' and (
      select coalesce(sum(weight), 0) from public.whatsapp_campaign_templates where campaign_id = p_campaign_id
    ) <> 100 then raise exception 'CAMPAIGN_WEIGHTS_MUST_TOTAL_100'; end if;
  elsif v_action = 'START' then
    v_target := 'RUNNING'; v_event := 'CAMPAIGN_STARTED';
    if v_campaign.status not in ('READY','RUNNING') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
    if not v_campaign.dry_run then raise exception 'REAL_DISPATCH_WORKER_NOT_VALIDATED'; end if;
  elsif v_action = 'PAUSE' then
    v_target := 'PAUSED'; v_event := 'CAMPAIGN_PAUSED';
    if v_campaign.status not in ('RUNNING','PAUSED') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
  elsif v_action = 'RESUME' then
    v_target := 'RUNNING'; v_event := 'CAMPAIGN_RESUMED';
    if v_campaign.status not in ('PAUSED','RUNNING') then raise exception 'INVALID_CAMPAIGN_TRANSITION'; end if;
  elsif v_action = 'STOP' then
    v_target := 'STOPPED'; v_event := 'CAMPAIGN_STOPPED';
    if v_campaign.status = 'STOPPED' then
      return jsonb_build_object('campaignId', p_campaign_id, 'status', 'STOPPED', 'changed', false);
    end if;
  else
    raise exception 'INVALID_CAMPAIGN_ACTION';
  end if;

  if v_campaign.status = v_target then
    return jsonb_build_object('campaignId', p_campaign_id, 'status', v_target, 'changed', false);
  end if;

  update public.whatsapp_campaigns
  set status = v_target,
      lifecycle_version = lifecycle_version + 1,
      started_at = case when v_action = 'START' then coalesce(started_at, now()) else started_at end,
      paused_at = case when v_action = 'PAUSE' then now() when v_action = 'RESUME' then null else paused_at end,
      finished_at = case when v_action = 'STOP' then now() else finished_at end,
      stop_reason = case when v_action = 'STOP' then nullif(btrim(p_reason), '') else stop_reason end,
      updated_at = now()
  where id = p_campaign_id
  returning * into v_campaign;

  if v_action = 'STOP' then
    update public.whatsapp_campaign_queue
    set status = 'CANCELLED', updated_at = now()
    where campaign_id = p_campaign_id
      and status in ('QUEUED','WAITING');
    update public.client_cadence_state
    set status = 'CANCELLED', next_due_at = null, updated_at = now()
    where campaign_id = p_campaign_id and status in ('ACTIVE','PAUSED');
  end if;

  insert into public.agent_events(
    entity_type, entity_id, event_type, payload, idempotency_key, actor_type
  ) values (
    'whatsapp_campaign', p_campaign_id::text, v_event,
    jsonb_build_object('status', v_target, 'reason', p_reason, 'lifecycleVersion', v_campaign.lifecycle_version),
    format('whatsapp-campaign:%s:lifecycle:%s:%s', p_campaign_id, v_campaign.lifecycle_version, v_action),
    'operator'
  ) on conflict do nothing;

  return jsonb_build_object('campaignId', p_campaign_id, 'status', v_target, 'changed', true);
end;
$$;

create or replace function public.stop_whatsapp_campaign_on_reply(
  p_campaign_id uuid,
  p_client_id bigint,
  p_reply_message_id bigint
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_campaign public.whatsapp_campaigns%rowtype;
  v_cancelled integer := 0;
  v_event_id bigint;
  v_label_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text || ':' || p_client_id::text, 0));
  select * into v_campaign from public.whatsapp_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if not v_campaign.stop_on_reply then
    return jsonb_build_object('campaignId', p_campaign_id, 'clientId', p_client_id, 'stopped', false);
  end if;
  if not exists (
    select 1 from public.whatsapp_messages m
    join public.whatsapp_conversations c on c.id = m.conversation_id
    where m.id = p_reply_message_id and m.client_id = p_client_id and m.direction = 'inbound'
      and (v_campaign.session_id is null or c.session_id = v_campaign.session_id)
  ) then raise exception 'REPLY_MESSAGE_CLIENT_MISMATCH'; end if;

  update public.whatsapp_campaign_queue
  set status = 'REPLIED', updated_at = now()
  where campaign_id = p_campaign_id and client_id = p_client_id
    and status in ('QUEUED','WAITING');
  get diagnostics v_cancelled = row_count;

  insert into public.agent_events(
    client_id, entity_type, entity_id, event_type, payload, idempotency_key, actor_type
  ) values (
    p_client_id, 'whatsapp_campaign', p_campaign_id::text, 'CLIENT_REPLIED',
    jsonb_build_object('replyMessageId', p_reply_message_id, 'cancelledQueueItems', v_cancelled),
    format('whatsapp-campaign:%s:reply:%s', p_campaign_id, p_reply_message_id), 'system'
  ) on conflict do nothing returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object(
      'campaignId', p_campaign_id, 'clientId', p_client_id,
      'stopped', true, 'changed', false, 'cancelledQueueItems', v_cancelled
    );
  end if;

  insert into public.client_cadence_state(
    campaign_id, client_id, cadence_id, status, replied_at, reply_message_id
  ) values (
    p_campaign_id, p_client_id, v_campaign.cadence_id, 'RESPONDED', now(), p_reply_message_id
  ) on conflict (campaign_id, client_id) do update
    set status = 'RESPONDED', next_due_at = null, replied_at = excluded.replied_at,
        reply_message_id = excluded.reply_message_id, updated_at = now();

  select id into v_label_id from public.crm_labels where dimension = 'CADENCE' and key = 'RESPONDED';
  update public.client_labels cl set removed_at = now()
  from public.crm_labels l
  where cl.label_id = l.id and cl.client_id = p_client_id and cl.removed_at is null
    and l.dimension = 'CADENCE';
  insert into public.client_labels(client_id, label_id, campaign_id, source)
  values (p_client_id, v_label_id, p_campaign_id, 'CAMPAIGN')
  on conflict (client_id, label_id) where removed_at is null do nothing;

  insert into public.agent_events(
    client_id, entity_type, entity_id, event_type, payload, idempotency_key, actor_type
  ) values (
    p_client_id, 'whatsapp_campaign', p_campaign_id::text, 'CADENCE_CANCELLED',
    jsonb_build_object('reason', 'CLIENT_REPLIED', 'cancelledQueueItems', v_cancelled),
    format('whatsapp-campaign:%s:cadence-cancelled:%s', p_campaign_id, p_reply_message_id), 'system'
  ) on conflict do nothing;

  insert into public.client_events(client_id, event_type, title, description, actor)
  values (
    p_client_id, 'CLIENT_REPLIED', 'Cliente respondeu à campanha',
    format('Campanha %s interrompida para este cliente; %s item(ns) pendente(s) cancelado(s).',
      v_campaign.name, v_cancelled), 'WhatsApp Dispatcher'
  );

  return jsonb_build_object(
    'campaignId', p_campaign_id, 'clientId', p_client_id,
    'stopped', true, 'changed', true, 'cancelledQueueItems', v_cancelled
  );
end;
$$;

create or replace function public.materialize_whatsapp_campaign_dry_run(
  p_campaign_id uuid,
  p_items jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_campaign public.whatsapp_campaigns%rowtype;
  v_item jsonb;
  v_client public.clients%rowtype;
  v_client_id bigint;
  v_step_id uuid;
  v_template_id uuid;
  v_template_version integer;
  v_media_id uuid;
  v_media_version integer;
  v_order integer;
  v_scheduled_for timestamptz;
  v_skip_reason text;
  v_key text;
  v_inserted integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 10000 then
    raise exception 'INVALID_DRY_RUN_ITEMS';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text, 0));
  select * into v_campaign from public.whatsapp_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if not v_campaign.dry_run then raise exception 'CAMPAIGN_IS_NOT_DRY_RUN'; end if;
  if v_campaign.status not in ('OFF','READY') then raise exception 'CAMPAIGN_NOT_PREVIEWABLE'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or (v_item - array[
        'clientId','cadenceStepId','templateId','templateVersion','mediaId',
        'mediaVersion','selectionOrder','scheduledFor','skipReason'
      ]::text[]) <> '{}'::jsonb then raise exception 'INVALID_DRY_RUN_ITEM'; end if;

    v_client_id := (v_item->>'clientId')::bigint;
    v_step_id := (v_item->>'cadenceStepId')::uuid;
    v_template_id := (v_item->>'templateId')::uuid;
    v_template_version := (v_item->>'templateVersion')::integer;
    v_order := (v_item->>'selectionOrder')::integer;
    v_scheduled_for := (v_item->>'scheduledFor')::timestamptz;
    v_media_id := case when nullif(v_item->>'mediaId', '') is null then null else (v_item->>'mediaId')::uuid end;
    v_media_version := case when v_media_id is null then null else (v_item->>'mediaVersion')::integer end;
    v_skip_reason := nullif(upper(btrim(v_item->>'skipReason')), '');

    if v_order <= 0 or v_template_version <= 0 then raise exception 'INVALID_DRY_RUN_ITEM'; end if;
    select * into v_client from public.clients where id = v_client_id;
    if not found then raise exception 'CLIENT_NOT_FOUND'; end if;
    if not exists (
      select 1 from public.whatsapp_cadence_steps
      where id = v_step_id and cadence_id = v_campaign.cadence_id and active
    ) then raise exception 'CADENCE_STEP_MISMATCH'; end if;
    if not exists (
      select 1 from public.whatsapp_campaign_templates
      where campaign_id = p_campaign_id and template_id = v_template_id
        and template_version = v_template_version
    ) then raise exception 'CAMPAIGN_TEMPLATE_MISMATCH'; end if;
    if v_media_id is not null and not exists (
      select 1 from public.whatsapp_dispatch_media
      where id = v_media_id and version = v_media_version and active
    ) then raise exception 'MEDIA_VERSION_MISMATCH'; end if;

    if v_client.opt_out_at is not null then v_skip_reason := 'OPT_OUT';
    elsif v_client.do_not_contact then v_skip_reason := 'DO_NOT_CONTACT';
    elsif not v_client.can_contact then v_skip_reason := 'CANNOT_CONTACT';
    elsif nullif(btrim(v_client.phone), '') is null then v_skip_reason := 'NO_PHONE';
    end if;

    v_key := format(
      'campaign:%s:client:%s:step:%s:template:%s:v%s:media:%s:v%s',
      p_campaign_id, v_client_id, v_step_id, v_template_id, v_template_version,
      coalesce(v_media_id::text, 'none'), coalesce(v_media_version::text, '0')
    );
    insert into public.whatsapp_campaign_queue(
      campaign_id, client_id, cadence_step_id, cadence_id, template_id,
      template_version, media_id, media_version, selection_order, status,
      is_dry_run, scheduled_for, idempotency_key, skip_reason
    ) values (
      p_campaign_id, v_client_id, v_step_id, v_campaign.cadence_id, v_template_id,
      v_template_version, v_media_id, v_media_version, v_order,
      case when v_skip_reason is null then 'QUEUED' else 'SKIPPED' end,
      true, v_scheduled_for, v_key, v_skip_reason
    ) on conflict (idempotency_key) do nothing;
    if found then v_inserted := v_inserted + 1; end if;
  end loop;

  return jsonb_build_object(
    'campaignId', p_campaign_id,
    'inserted', v_inserted,
    'total', jsonb_array_length(p_items),
    'dryRun', true
  );
end;
$$;

alter table public.whatsapp_cadences enable row level security;
alter table public.whatsapp_cadence_steps enable row level security;
alter table public.whatsapp_dispatch_media enable row level security;
alter table public.whatsapp_approaches enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_template_versions enable row level security;
alter table public.whatsapp_campaigns enable row level security;
alter table public.whatsapp_campaign_templates enable row level security;
alter table public.whatsapp_campaign_queue enable row level security;
alter table public.client_cadence_state enable row level security;
alter table public.crm_labels enable row level security;
alter table public.client_labels enable row level security;

revoke all on public.whatsapp_cadences, public.whatsapp_cadence_steps,
  public.whatsapp_dispatch_media, public.whatsapp_approaches, public.whatsapp_templates,
  public.whatsapp_template_versions, public.whatsapp_campaigns,
  public.whatsapp_campaign_templates, public.whatsapp_campaign_queue,
  public.client_cadence_state, public.crm_labels, public.client_labels
  from public, anon, authenticated;
grant all on public.whatsapp_cadences, public.whatsapp_cadence_steps,
  public.whatsapp_dispatch_media, public.whatsapp_approaches, public.whatsapp_templates,
  public.whatsapp_template_versions, public.whatsapp_campaigns,
  public.whatsapp_campaign_templates, public.whatsapp_campaign_queue,
  public.client_cadence_state, public.crm_labels, public.client_labels
  to service_role;
grant usage, select on sequence public.whatsapp_campaign_queue_id_seq,
  public.client_cadence_state_id_seq, public.client_labels_id_seq to service_role;

revoke execute on function public.log_whatsapp_campaign_created() from public, anon, authenticated;
revoke execute on function public.transition_whatsapp_campaign(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.stop_whatsapp_campaign_on_reply(uuid,bigint,bigint) from public, anon, authenticated;
revoke execute on function public.materialize_whatsapp_campaign_dry_run(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.transition_whatsapp_campaign(uuid,text,text) to service_role;
grant execute on function public.stop_whatsapp_campaign_on_reply(uuid,bigint,bigint) to service_role;
grant execute on function public.materialize_whatsapp_campaign_dry_run(uuid,jsonb) to service_role;
