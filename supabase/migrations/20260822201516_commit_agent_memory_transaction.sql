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
begin
  if p_facts is null or jsonb_typeof(p_facts) <> 'array' then raise exception 'Facts must be an array'; end if;
  for v_fact in select value from jsonb_array_elements(p_facts)
  loop
    v_source_message_id := nullif(v_fact->>'sourceMessageId','')::bigint;
    v_fact_ids := array_append(v_fact_ids, public.upsert_agent_client_knowledge(
      p_client_id,
      v_fact->>'key',
      v_fact->'value',
      v_fact->>'knowledgeType',
      coalesce(v_source_message_id, p_last_message_id),
      (v_fact->>'confidence')::numeric(4,3)
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
