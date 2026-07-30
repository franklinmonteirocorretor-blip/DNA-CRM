-- ==========================================================================
-- DNA CRM — Sprint 12: Segurança Corporativa / RBAC (migration 0026)
-- Objetivo: RLS em TODAS as tabelas, políticas granulares por perfil.
-- Administrador: acesso total. Gerente: tudo empresa. Supervisor: equipe.
-- Corretor: apenas próprios registros.
-- ==========================================================================

-- ──────────────── PARTE 1: FUNÇÕES AUXILIARES DE AUTORIZAÇÃO ──────────────────

-- Verifica se o usuário é administrador
create or replace function is_admin() returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid()
      and perfil = 'ADMINISTRADOR'
      and ativo = true
      and deleted_at is null
  );
$$;

-- Verifica se o usuário é gerente
create or replace function is_gerente() returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid()
      and perfil in ('ADMINISTRADOR', 'GERENTE')
      and ativo = true
      and deleted_at is null
  );
$$;

-- Verifica se o usuário é supervisor ou acima
create or replace function is_supervisor() returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from usuarios
    where id = auth.uid()
      and perfil in ('ADMINISTRADOR', 'GERENTE', 'SUPERVISOR')
      and ativo = true
      and deleted_at is null
  );
$$;

-- Verifica se o usuário logado é gerente de um corretor específico
create or replace function is_gerente_de(check_id uuid) returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from usuarios
    where id = check_id
      and (gerente_id = auth.uid() or id = auth.uid())
      and deleted_at is null
  )
  or is_admin();
$$;

-- Verifica se o supervisor gerencia um corretor específico
create or replace function is_supervisor_de(check_id uuid) returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from usuarios
    where id = check_id
      and (supervisor_id = auth.uid() or gerente_id = auth.uid() or id = auth.uid())
      and deleted_at is null
  )
  or is_gerente();
$$;

-- ──────────────── PARTE 2: AUTORIDADE EM STORAGE ─────────────────────────────

-- Apaga a política antiga que dava acesso irrestrito
drop policy if exists "documentos_leitura" on storage.objects;
drop policy if exists "documentos_upload" on storage.objects;

-- Nova política: administrador acesso total
create policy admin_docs_all on storage.objects for all
  using (is_admin());

-- Nova política: corretores e acima leem
create policy autenticado_docs_select on storage.objects for select
  using (auth.role() = 'authenticated');

-- Corretor gerente: upload
create policy gerente_docs_insert on storage.objects for insert
  with check (is_gerente() or is_supervisor());

-- ──────────────── PARTE 3: CORRECAO DE POLÍCOS FRACOS ────────────────────────

-- 3.1 documentos_all era muito permissivo (qualquer autenticado = tudo)
drop policy if exists documentos_all on documentos;

create policy documentos_select on documentos for select using (
  is_admin()
  or is_gerente()
  or (
    corretor_responsavel_id = auth.uid()
    and deleted_at is null
  )
);

create policy documentos_insert on documentos for insert with check (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or corretor_responsavel_id = auth.uid()
);

create policy documentos_update on documentos for update using (
  is_admin()
  or is_gerente()
  or is_supervisor()
);

-- 3.2 comparecimentos_all muito permissivo
drop policy if exists comparecimentos_all on comparecimentos;

create policy comparecimentos_select on comparecimentos for select using (
  is_admin() or is_gerente()
  or exists (
    select 1 from agendamentos a
    where a.id = comparecimentos.agendamento_id
    and a.corretor_id = auth.uid()
  ));

create policy comparecimentos_insert on comparecimentos for insert with check (
  is_admin() or is_gerente()
  or exists (
    select 1 from agendamentos a
    where a.id = comparecimentos.agendamento_id
    and a.corretor_id = auth.uid()
  ));

-- 3.3 historico_acoes sem INSERT policy
drop policy if exists historico_select on historico_acoes;
drop policy if exists historico_select_por_cliente on historico_acoes;

create policy historico_select on historico_acoes for select using (
  is_admin() or is_gerente());

create policy historico_insert on historico_acoes for insert with check (
  is_admin() or is_gerente()
  or auth.uid() is not null); -- sistema + corretores inserindo via trigger

-- ──────────────── PARTE 4: CONJUGES (política fraca) ────────────────────────

drop policy if exists conjuges_all on conjuges;

create policy conjuges_select on conjuges for select using (
  is_admin() or is_gerente()
  or exists (
    select 1 from clientes c
    where c.id = conjuges.cliente_id
    and c.corretor_responsavel_id = auth.uid()
  ));

create policy conjuges_insert on conjuges for insert with check (
  is_admin() or is_gerente()
  or exists (
    select 1 from clientes c
    where c.id = conjuges.cliente_id
    and c.corretor_responsavel_id = auth.uid()
  ));

create policy conjuges_update on conjuges for update using (
  is_admin() or is_gerente());

 -- ──────────────── PARTE 5: LEADS ────────────────────────────────────────

-- Leads já tem políticas boas. Só adicionar do supervisor.

create policy if not exists leads_supervisor on leads for select
  using (is_supervisor_or_same_corretor(lead.corretor_id) or is_gerente());

create policy if not exists leads_update_sup on leads for update using (
  is_admin() or is_gerente());

-- ──────────────── PARTE 6: NOTIFICACOES ───────────────────────────────────

-- Notificações já bem seguras (owner-only). Não precisa alterar.

-- ──────────────── PARTE 7: USUARIOS DELETADOS ────────────────────────────

-- Garantir que usuários deletados não apareçam em queries
create policy or replace usuarios_select_ativos on usuarios for select
  using (deleted_at is null or is_admin());

-- ──────────────── PARTE 8: PRODUCAO_DIARIA ────────────────────────────────

-- Reforçar: corretor só vê sua própria produção; gerente vê de todos
drop policy if exists producao_select on producao_diaria;

create policy producao_select on producao_diaria for select using (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or usuario_id = auth.uid());

-- ──────────────── PARTE 9: INDICES DE AUDITORIA ────────────────────────────

-- Índices para auditoria rápida no historico_acoes
create index if not exists idx_historico_usuario on historico_acoes (usuario_id);
create index if not exists idx_historico_entidade_tipo on historico_acoes (entidade, entidade_id);
create index if not exists idx_historico_data on historico_acoes (created_at desc);

-- Audit logging para coluna de IP (se existir)
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name = 'historico_acoes' and column_name = 'ip_origem'
    and table_schema = 'public') then
    alter table historico_acoes add column ip_origem inet;
  end if;
end;
$$;