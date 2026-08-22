alter table public.projects
  add column if not exists city text;

update public.projects
set city = case
  when lower(coalesce(region, '')) like '%alto%' then 'Altos'
  when lower(coalesce(region, '')) like '%demerval%' then 'Demerval Lobão'
  when lower(coalesce(region, '')) like '%timon%' then 'Timon'
  else 'Teresina'
end
where city is null or btrim(city) = '';

alter table public.projects
  alter column city set default 'Teresina',
  alter column city set not null;

alter table public.projects
  drop constraint if exists projects_city_check;

alter table public.projects
  add constraint projects_city_check
  check (city in ('Altos', 'Demerval Lobão', 'Teresina', 'Timon'));

create index if not exists projects_city_builder_active_idx
  on public.projects (city, builder_id, name)
  where active = true;

comment on column public.projects.city is
  'Cidade canônica do catálogo: Altos, Demerval Lobão, Teresina ou Timon.';
