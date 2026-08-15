create index if not exists idx_appointments_client on public.appointments(client_id);
create index if not exists idx_documents_client on public.documents(client_id);
create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_notifications_client on public.notifications(client_id);
create index if not exists idx_sales_client on public.sales(client_id);
create index if not exists idx_sales_project on public.sales(project_id);
