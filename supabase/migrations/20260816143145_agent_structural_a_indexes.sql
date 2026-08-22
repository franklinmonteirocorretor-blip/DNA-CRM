create index if not exists idx_agent_action_executions_client
  on public.agent_action_executions(client_id, created_at desc);
create index if not exists idx_agent_audit_client
  on public.agent_audit_logs(client_id, created_at desc);
create index if not exists idx_agent_escalations_client
  on public.agent_human_escalations(client_id, created_at desc);

grant usage, select on all sequences in schema public to service_role;
