alter table public.cca_partners
  add column if not exists analyst_contacts jsonb not null default '[]'::jsonb,
  add column if not exists regions text[] not null default '{}';

update public.cca_partners
set analyst_contacts = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object('name', analyst_name, 'phone', '', 'whatsapp', '')
    )
    from unnest(analysts) as analyst_name
    where btrim(analyst_name) <> ''
  ),
  '[]'::jsonb
)
where analyst_contacts = '[]'::jsonb
  and cardinality(analysts) > 0;

update public.cca_partners
set regions = array[region]
where cardinality(regions) = 0
  and region is not null
  and btrim(region) <> '';

alter table public.cca_partners
  drop constraint if exists cca_partners_analyst_contacts_array;

alter table public.cca_partners
  add constraint cca_partners_analyst_contacts_array
  check (jsonb_typeof(analyst_contacts) = 'array');

comment on column public.cca_partners.analyst_contacts is
  'Contatos dos analistas do CCA: nome, telefone e WhatsApp.';

comment on column public.cca_partners.regions is
  'Regiões atendidas pelo CCA, selecionadas entre as opções operacionais do CRM.';
