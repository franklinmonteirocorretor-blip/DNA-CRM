create or replace function public.update_client_base(
  p_import_id bigint,
  p_file_name text,
  p_origin_type text,
  p_origin_detail text default null,
  p_project_interest text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current public.lead_imports%rowtype;
  v_client_ids bigint[];
begin
  perform pg_advisory_xact_lock(hashtext('client_base_management'));

  select * into v_current
  from public.lead_imports
  where id = p_import_id
  for update;

  if not found then
    raise exception 'BASE_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.lead_imports
    where lower(trim(file_name)) = lower(trim(p_file_name))
      and id <> p_import_id
  ) then
    raise exception 'BASE_NAME_CONFLICT';
  end if;

  select coalesce(array_agg(distinct client_id), '{}'::bigint[])
  into v_client_ids
  from public.client_sources
  where source_file = v_current.file_name;

  update public.client_sources
  set source_file = trim(p_file_name),
      origin_type = trim(p_origin_type),
      origin_detail = trim(p_file_name),
      project_interest = coalesce(nullif(trim(p_project_interest), ''), project_interest)
  where source_file = v_current.file_name;

  update public.lead_imports
  set file_name = trim(p_file_name),
      origin_type = trim(p_origin_type),
      origin_detail = coalesce(nullif(trim(p_origin_detail), ''), origin_detail)
  where id = p_import_id;

  update public.clients
  set origin_type = trim(p_origin_type),
      origin_detail = trim(p_file_name),
      project_interest = coalesce(nullif(trim(p_project_interest), ''), project_interest),
      updated_at = now()
  where id = any(v_client_ids)
    and origin_detail = v_current.file_name;

  insert into public.client_events (client_id, event_type, title, description)
  select unnest(v_client_ids), 'BASE_UPDATED', 'Base de origem atualizada',
         format('Base %s atualizada para %s.', v_current.file_name, trim(p_file_name));

  return jsonb_build_object('ok', true, 'leads', cardinality(v_client_ids));
end;
$$;

create or replace function public.delete_client_base(p_import_id bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_file_name text;
  v_client_ids bigint[];
begin
  perform pg_advisory_xact_lock(hashtext('client_base_management'));

  select file_name into v_file_name
  from public.lead_imports
  where id = p_import_id
  for update;

  if not found then
    raise exception 'BASE_NOT_FOUND';
  end if;

  select coalesce(array_agg(distinct client_id), '{}'::bigint[])
  into v_client_ids
  from public.client_sources
  where source_file = v_file_name;

  delete from public.client_sources where source_file = v_file_name;
  delete from public.lead_imports where id = p_import_id;

  insert into public.client_events (client_id, event_type, title, description)
  select unnest(v_client_ids), 'BASE_UNLINKED', 'Base de origem removida',
         format('O vínculo com a base %s foi removido. O cliente foi preservado na ficha única.', v_file_name);

  return jsonb_build_object('ok', true, 'unlinked', cardinality(v_client_ids));
end;
$$;
