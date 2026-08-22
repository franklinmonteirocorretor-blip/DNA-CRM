create or replace function public.commit_agent_memory(
  p_client_id bigint,
  p_conversation_id uuid,
  p_summary text,
  p_last_message_id bigint,
  p_facts jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_fact jsonb;
  v_fact_ids bigint[] := '{}';
  v_summary_id bigint;
  v_source_message_id bigint;
  v_confidence numeric(4,3);
  v_knowledge_type text;
begin
  if p_facts is null or jsonb_typeof(p_facts) <> 'array' then
    raise exception 'Facts must be an array';
  end if;
  if jsonb_array_length(p_facts) > 100 then
    raise exception 'Facts array exceeds limit';
  end if;

  for v_fact in select value from jsonb_array_elements(p_facts)
  loop
    if jsonb_typeof(v_fact) <> 'object' then
      raise exception 'Each fact must be an object';
    end if;
    if (v_fact - array['key','value','knowledgeType','confidence','sourceMessageId']::text[]) <> '{}'::jsonb then
      raise exception 'Fact contains unsupported fields';
    end if;
    if not (v_fact ? 'key')
      or jsonb_typeof(v_fact->'key') <> 'string'
      or btrim(v_fact->>'key') = '' then
      raise exception 'Fact key must be a non-empty string';
    end if;
    if not (v_fact ? 'value') or jsonb_typeof(v_fact->'value') = 'null' then
      raise exception 'Fact value is required';
    end if;
    if not (v_fact ? 'knowledgeType')
      or jsonb_typeof(v_fact->'knowledgeType') <> 'string'
      or v_fact->>'knowledgeType' not in ('FACT','INFERENCE') then
      raise exception 'Fact knowledgeType is invalid';
    end if;
    if not (v_fact ? 'confidence') or jsonb_typeof(v_fact->'confidence') <> 'number' then
      raise exception 'Fact confidence must be a number';
    end if;

    v_knowledge_type := v_fact->>'knowledgeType';
    v_confidence := (v_fact->>'confidence')::numeric(4,3);
    if v_confidence < 0 or v_confidence > 1 then
      raise exception 'Fact confidence must be between 0 and 1';
    end if;
    if v_knowledge_type = 'INFERENCE' and v_confidence >= 1 then
      raise exception 'INFERENCE confidence must be lower than 1';
    end if;

    v_source_message_id := null;
    if v_fact ? 'sourceMessageId' and jsonb_typeof(v_fact->'sourceMessageId') <> 'null' then
      if jsonb_typeof(v_fact->'sourceMessageId') <> 'number'
        or (v_fact->>'sourceMessageId') !~ '^[1-9][0-9]*$' then
        raise exception 'Fact sourceMessageId must be a positive integer';
      end if;
      v_source_message_id := (v_fact->>'sourceMessageId')::bigint;
    end if;

    v_fact_ids := array_append(v_fact_ids, public.upsert_agent_client_knowledge(
      p_client_id,
      v_fact->>'key',
      v_fact->'value',
      v_knowledge_type,
      coalesce(v_source_message_id, p_last_message_id),
      v_confidence
    ));
  end loop;

  v_summary_id := public.append_agent_conversation_summary(
    p_client_id, p_conversation_id, p_summary, p_last_message_id
  );
  return jsonb_build_object('factIds',to_jsonb(v_fact_ids),'summaryId',v_summary_id);
end;
$$;
revoke all on function public.commit_agent_memory(bigint,uuid,text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.commit_agent_memory(bigint,uuid,text,bigint,jsonb) to service_role;

create or replace function public.set_agent_playbook_activation(
  p_playbook_id uuid,
  p_version integer,
  p_active boolean
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_version_id uuid;
  v_status text;
  v_analyzed_at timestamptz;
  v_analysis_error text;
  v_active_version integer;
  v_playbook_active boolean;
begin
  if p_playbook_id is null or p_version is null or p_version <= 0 or p_active is null then
    raise exception 'Invalid playbook activation payload';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_playbook_id::text, 0));
  select active_version, active
  into v_active_version, v_playbook_active
  from public.agent_playbooks
  where id = p_playbook_id
  for update;
  if not found then
    raise exception 'Playbook not found';
  end if;

  select id, status, analyzed_at, analysis_error
  into v_version_id, v_status, v_analyzed_at, v_analysis_error
  from public.agent_playbook_versions
  where playbook_id = p_playbook_id and version = p_version
  for update;
  if not found then
    raise exception 'Playbook version not found';
  end if;

  if p_active then
    if v_status not in ('review','inactive','active')
      or v_analyzed_at is null
      or v_analysis_error is not null then
      raise exception 'Playbook version must complete analysis before activation';
    end if;
    if not exists (
      select 1 from public.agent_playbook_principles
      where playbook_version_id = v_version_id
    ) or exists (
      select 1 from public.agent_playbook_principles
      where playbook_version_id = v_version_id and not reviewed
    ) then
      raise exception 'Playbook principles must be reviewed before activation';
    end if;
    if v_status = 'active'
      and (not v_playbook_active or v_active_version is distinct from p_version) then
      raise exception 'Playbook activation state is inconsistent';
    end if;

    update public.agent_playbook_versions
    set status = 'inactive'
    where playbook_id = p_playbook_id
      and id <> v_version_id
      and status = 'active';
    update public.agent_playbook_versions
    set status = 'active'
    where id = v_version_id;
    update public.agent_playbooks
    set active_version = p_version, active = true, updated_at = now()
    where id = p_playbook_id;
  else
    if v_playbook_active and v_active_version is distinct from p_version then
      raise exception 'Requested playbook version is not active';
    end if;
    update public.agent_playbook_versions
    set status = 'inactive'
    where playbook_id = p_playbook_id and status = 'active';
    update public.agent_playbooks
    set active_version = null, active = false, updated_at = now()
    where id = p_playbook_id;
  end if;

  return jsonb_build_object(
    'playbookId', p_playbook_id,
    'version', p_version,
    'active', p_active
  );
end;
$$;
revoke all on function public.set_agent_playbook_activation(uuid,integer,boolean) from public, anon, authenticated;
grant execute on function public.set_agent_playbook_activation(uuid,integer,boolean) to service_role;
