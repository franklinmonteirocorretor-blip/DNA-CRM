select setval(pg_get_serial_sequence('public.clients','id'), coalesce((select max(id) from public.clients),1), true);
select setval(pg_get_serial_sequence('public.builders','id'), coalesce((select max(id) from public.builders),1), true);
select setval(pg_get_serial_sequence('public.projects','id'), coalesce((select max(id) from public.projects),1), true);
select setval(pg_get_serial_sequence('public.client_events','id'), coalesce((select max(id) from public.client_events),1), true);
select setval(pg_get_serial_sequence('public.lead_imports','id'), coalesce((select max(id) from public.lead_imports),1), true);
select setval(pg_get_serial_sequence('public.client_sources','id'), coalesce((select max(id) from public.client_sources),1), true);
