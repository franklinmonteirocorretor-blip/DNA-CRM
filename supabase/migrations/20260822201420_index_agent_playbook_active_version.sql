create index if not exists agent_playbooks_active_version_idx
  on public.agent_playbooks(id, active_version);
