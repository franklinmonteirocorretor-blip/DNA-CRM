update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/octet-stream')
where id = 'whatsapp-media'
  and not ('application/octet-stream' = any(allowed_mime_types));

create unique index if not exists lead_imports_normalized_file_name_uidx
on public.lead_imports (
  lower(regexp_replace(btrim(file_name), '\s+', ' ', 'g'))
);

create index if not exists whatsapp_messages_client_id_idx
on public.whatsapp_messages (client_id)
where client_id is not null;
