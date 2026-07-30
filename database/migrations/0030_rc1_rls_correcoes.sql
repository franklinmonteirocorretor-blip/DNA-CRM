-- ==========================================================================
-- DNA CRM — RC1: Correções de RLS detectadas na auditoria da FASE 4
-- ==========================================================================
-- Problema 1: is_supervisor_or_same_corretor() não existe (policy leads_supervisor)
-- Problema 2: Supervisor sem permissão em: clientes, atividades, agendamentos,
--              e policies quebradas em leads/notificações.
-- Esta migration corrige todos os gaps. Segurança bloqueante para RC1.
-- ==========================================================================

-- ─── PARTE 1: Criar função ausente is_supervisor_or_same_corretor() ─────
create or replace function is_supervisor_or_same_corretor(candidate_id uuid)
returns boolean
language sql stable security definer
as $$
  select is_admin() or is_gerente() or is_supervisor()
    or candidate_id = auth.uid();
$$;

-- ─── PARTE 2: Atualizar policies de LEADS (linha 178 estava quebrada) ───
-- Drop antiga (se existir, criada com a função inexistente)
drop policy if exists leads_supervisor on leads;
drop policy if exists leads_supervisor on leads;

create policy leads_supervisor_select on leads for select using (
  is_admin() or is_gerente()
  or is_supervisor()
  or corretor_id = auth.uid()
);

create policy leads_supervisor_insert on leads for insert with check (
  is_admin() or is_gerente()
  or is_supervisor_de(corretor_id)
  or corretor_id = auth.uid()
);

create policy leads_supervisor_update on leads for update using (
  is_admin() or is_gerente()
  or is_supervisor_de(corretor_id)
);

-- ─── PARTE 3: Atualizar policies de clientes (incluir supervisor) ────────
-- Substitui as políticas antigas da migration 0000
drop policy if exists clientes_select on clientes;
drop policy if exists clientes_insert on clientes;
drop policy if exists clientes_update on clientes;

create policy clientes_select on clientes for select using (
  is_admin()
  or is_gerente()
  or is_supervisor_de(corretor_responsavel_id)
  or corretor_responsavel_id = auth.uid()
);

create policy clientes_insert on clientes for insert with check (
  is_admin()
  or is_gerente()
  or is_supervisor_de(corretor_responsavel_id)
  or corretor_responsavel_id = auth.uid()
);

create policy clientes_update on clientes for update using (
  is_admin()
  or is_gerente()
  or is_supervisor_de(corretor_responsavel_id)
  or corretor_responsavel_id = auth.uid()
);

-- ─── PARTE 4: Atividades — supervisor no select ────────────────────────────
drop policy if exists atividades_select on atividades;

create policy atividades_select on atividades for select using (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or usuario_id = auth.uid()
);

-- ─── PARTE 5: Agendamentos — supervisor em todas as ações ──────────────────
drop policy if exists agendamentos_select on agendamentos;
drop policy if exists agendamentos_write on agendamentos;
drop policy if exists agendamentos_update on agendamentos;

create policy agendamentos_select on agendamentos for select using (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or corretor_id = auth.uid()
);

create policy agendamentos_write on agendamentos for insert with check (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or corretor_id = auth.uid()
);

create policy agendamentos_update on agendamentos for update using (
  is_admin()
  or is_gerente()
  or is_supervisor()
  or corretor_id = auth.uid()
);

-- ─── PARTE 6: Conjuges — review: policies da 0000 e 0026 já ok ───────────
-- Já estão com is_gerente() + corretor_responsavel_id. Adicionar supervisor:
drop policy if exists conjuges_select on conjuges;
drop policy if exists conjuges_insert on conjuges;

create policy conjuges_select on conjuges for select using (
  is_admin() or is_gerente() or is_supervisor()
  or exists (
    select 1 from clientes c
    where c.id = conjuges.cliente_id
      and (c.corretor_responsavel_id = auth.uid()
           or is_supervisor_de(c.corretor_responsavel_id))
  )
);

create policy conjuges_insert on conjuges for insert with check (
  is_admin() or is_gerente() or is_supervisor()
  or exists (
    select 1 from clientes c
    where c.id = conjuges.cliente_id
      and (c.corretor_responsavel_id = auth.uid()
           or is_supervisor_de(c.corretor_responsavel_id))
  )
);

-- Note: conjuges_update da 0026 já cobre admin+gerente; adicionar supervisor.
create policy conjuges_update_supervisor on conjuges for update using (
  is_admin() or is_gerente() or is_supervisor()
);

-- ─── PARTE 7: Empreendimentos — não tem RLS na 0000; proteger ────────────
alter table empreendimentos enable row level security;

create policy empreendimentos_select on empreendimentos for select
  using (auth.uid() is not null); -- qualquer autenticado vê imóveis

create policy empreendimentos_admin on empreendimentos for insert
  with check (is_admin() or is_gerente());

create policy empreendimentos_update_admin on empreendimentos for update
  using (is_admin() or is_gerente());

-- ─── PARTE 8: Equipes — proteger dados organizacionais ───────────────────
alter table equipes enable row level security;

create policy equipes_select on equipes for select
  using (auth.uid() is not null); -- visível autorizando

create policy equipes_admin_write on equipes for insert
  with check (is_admin() or is_gerente());

create policy equipes_admin_update on equipes for update
  using (is_admin() or is_gerente());

-- ─── PARTE 9: Notificaçõs — certificando que políticas existem ──────────
alter table notificacoes enable row level security;

create policy if not exists notificacoes_select on notificacoes for select
  using (destinatario_id = auth.uid() or is_admin() or is_gerente());

create policy if not exists notificacoes_insert on notificacoes for insert
  with check (is_admin() or is_gerente() or auth.uid() is not null);

-- ─── PARTE 10: Rankings (views materializadas) sem referência direta ────
-- ranking_central é uma VIEW; ranking_corretor também são views criadas
-- por trigger/produção. Segurança via RLS da tabela base.

-- ─── PARTE 11: Index para performance ─────────────────────────────────────
create index if not exists idx_empreendimentos_status on empreendimentos(status);
create index if not exists idx_equipes_nome on equipes(nome);