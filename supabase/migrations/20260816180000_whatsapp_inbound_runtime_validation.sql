alter table public.whatsapp_messages
  add column if not exists media_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_agent_audit_idempotency
  on public.agent_audit_logs(idempotency_key)
  where idempotency_key is not null;
