alter table public.cca_partners
  add column if not exists analysts text[] not null default '{}';

comment on column public.cca_partners.analysts is
  'Nomes dos analistas vinculados ao CCA; permite mais de um profissional.';
