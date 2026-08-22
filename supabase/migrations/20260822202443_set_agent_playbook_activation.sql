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
begin
  perform pg_advisory_xact_lock(hashtextextended(p_playbook_id::text, 0));
  select id into v_version_id from public.agent_playbook_versions
  where playbook_id = p_playbook_id and version = p_version for update;
  if v_version_id is null then raise exception 'Playbook version not found'; end if;
  if p_active then
    update public.agent_playbook_versions set status = 'inactive' where playbook_id = p_playbook_id and id <> v_version_id;
    update public.agent_playbook_versions set status = 'active', analyzed_at = coalesce(analyzed_at, now()) where id = v_version_id;
    update public.agent_playbooks set active_version = p_version, active = true, updated_at = now() where id = p_playbook_id;
  else
    update public.agent_playbooks set active_version = null, active = false, updated_at = now() where id = p_playbook_id;
    update public.agent_playbook_versions set status = 'inactive' where id = v_version_id;
  end if;
  return jsonb_build_object('playbookId',p_playbook_id,'version',p_version,'active',p_active);
end;
$$;
revoke all on function public.set_agent_playbook_activation(uuid,integer,boolean) from public, anon, authenticated;
grant execute on function public.set_agent_playbook_activation(uuid,integer,boolean) to service_role;
