-- ==========================================================================
-- DNA CRM — Sprint 10: Consolidação de Índices e Constraints (migration 0024)
-- Auditoria completa do schema (migrations 0000-0023) — corrige gaps
-- encontrados: índices faltantes, constraints, fuso e políticas RLS.
-- ==========================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1: ÍNDICES FALTANTES EM CLIENTES (tabela central do CRM)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 etapa_atual isolado — filtro primário do kanban/pipeline
--     (já existe idx_clientes_pipeline composto, mas queries que filtram só
--      por etapa_atual sem WHERE corretor_responsavel_id perdem a indexação)
create index if not exists idx_clientes_etapa
  on clientes (etapa_atual)
  where deleted_at is null;

-- 1.2 created_at — consultas recentes ("novos leads esta semana")
--     (atividades e historico_acoes têm índice em created_at, clientes não)
create index if not exists idx_clientes_created_at
  on clientes (created_at)
  where deleted_at is null;

-- 1.3 data_fechamento — essencial para ranking VGV e relatórios gerenciais
--     (a função get_ranking_vgv filtra data_fechamento sem índice dedicado)
create index if not exists idx_clientes_data_fechamento
  on clientes (data_fechamento)
  where deleted_at is null and data_fechamento is not null;

-- 1.4 próximo ação vencendo — alerta de follow-ups atrasados
--     (consulta corretor + data, padrão comum na central de follow-up)
create index if not exists idx_clientes_proxima_acao
  on clientes (proxima_acao_em)
  where deleted_at is null and proxima_acao_em is not null;

-- 1.5 Composto: etapa_atual + created_at — pipeline diário ("quantos entraram na
--     etapa X nos últimos 7 dias")
--     (distinto do idx_clientes_pipeline que cruza etapa_atual com corretor)
create index if not exists idx_clientes_etapa_created
  on clientes (etapa_atual, created_at)
  where deleted_at is null;

-- 1.6 Composto: corretor_responsavel_id + data_fechamento — ranking VGV por corretor
--     (a função get_ranking_vgv faz GROUP BY corretor_responsavel_id + WHERE data_fechamento)
create index if not exists idx_clientes_corretor_fechamento
  on clientes (corretor_responsavel_id, data_fechamento)
  where deleted_at is null and data_fechamento is not null;

-- 1.7 Composto: corretor_responsavel_id + etapa_atual + entrou_etapa_em
--     — para o alerta de "cliente parado na etapa há X dias" (Pipeline Sprint 5)
create index if not exists idx_clientes_corretor_etapa_entrou
  on clientes (corretor_responsavel_id, etapa_atual, entrou_etapa_em)
  where deleted_at is null;

-- 1.8 Composto: etapa_atual + entrou_etapa_em — funil gerencial geral
create index if not exists idx_clientes_etapa_entrou
  on clientes (etapa_atual, entrou_etapa_em)
  where deleted_at is null;

-- 1.9 Composto: ficha_proposta_assinada + data_fechamento — ranking de vendas
--     (amiúde feito "WHERE ficha_proposta_assinada = true AND dt_fechamento >= ...")
create index if not exists idx_clientes_fechamento_assinado
  on clientes (ficha_proposta_assinada, data_fechamento)
  where deleted_at is null and ficha_proposta_assinada = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 2: ÍNDICES FALTANTES EM PRODUCAO_DIARIA
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 Composto usuario_id + data — ranking mensal e KPIs (função fn_ranking_mes
--     faz JOIN em usuario_id e WHERE data >= date_trunc('month',...))
--     (já existe o unique (usuario_id, data) que funciona como índice, mas a
--      direção correta para JOIN é usuario_id à esquerda; o unique cria ambos,
--      então esta criação é um passo explícito SE o unique não gerar um índice
--      público. O IF NOT EXISTS garante idempotência.)
create index if not exists idx_producao_usuario_data
  on producao_diaria (usuario_id, data);

-- 2.2 data isolado com DESC — função de ranking do mês corrente
--     (mais rápido que o BRIN em datasets pequenos/médios)
create index if not exists idx_producao_data_desc
  on producao_diaria (data desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 3: ÍNDICES FALTANTES EM AGENDAMENTOS
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 status + data_hora — filtro da Agenda (sprint 2)
--     (já existe idx_agendamentos_status isolado, mas a consulta mais comum
--      é "agendamentos AGENDADOS hoje para o corretor X" que só usa o composto
--      corretor_id + data_hora)
--     -> Este índice cobre "quais agendamentos CONFIRMADOS para qualquer corretor"
create index if not exists idx_agendamentos_status_data
  on agendamentos (status, data_hora);

-- 3.2 cliente_id + data_hora — histórico da timeline do cliente
create index if not exists idx_agendamentos_cliente_data
  on agendamentos (cliente_id, data_hora);

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 4: ÍNDICES FALTANTES EM DOCUMENTOS
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 status_validacao — quando um gerente filtra por "todos os documentos REJEITADOS"
--     da equipe (no Painel de Documentos da Sprint 7, sem filtro adicional)
create index if not exists idx_documentos_status
  on documentos (status_validacao)
  where deleted_at is null;

-- 4.2 status_validacao + cliente_id — a checklist checa status por cliente
create index if not exists idx_documentos_status_cliente
  on documentos (status_validacao, cliente_id)
  where deleted_at is null;

-- 4.3 de_dependente parcial — documentos de dependentes NÃO contam na pasta
--     essencial; as funções de pasta já filtram `where not de_dependente`
create index if not exists idx_documentos_cliente_tipo_nao_dependente
  on documentos (cliente_id, tipo)
  where deleted_at is null and not de_dependente;

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 5: ÍNDICES EM NOTIFICACOES, LEADS, USUARIOS
-- ──────────────────────────────────────────────────────────── PPT 5 já tudo ok.
--     · Notificacoes: idx_notificacoes_usuario_lida (composto 3 colunas) — ótimo.
--     · Leads: idx_leads_corretor (corretor_id, crteated_at) — ok.
--     · Usuarios: idx_usuarios_perfil, idx_usuarios_gerente, idx_usuarios_cpf,
--           idx_usuarios_creci, idxUsuarios_supervisor, idx_usuarios_status,
--           idx_usuarios_equipe — cobertura excelente.
--     · Empreendimentos: idx_emperendimentos_ativo — ok.
--     · Equipes: idx_equipes_gerente — ok.
--     · Atividades: idx_atividades_usuario_data (composto), idx_atividades_cliente_data
--           (composto), idx_atividades_created_brin — ok.
-- ─────────────────────────────────────────────────────────────────────────────

-- ============================================================
-- PARTE 6: CONSTRAINTS FALTANTES
-- ============================================================

-- 6.1. agendamentos.deleted_at NÃO existe — não pode soft-delete sem a coluna.
--     Ekse importa porque a migração 0020 criou um índice WHERE deleted_at IS NULL
--     na tabela agendamentos sem que a coluna existed; isto geraria erro no SQL.
-- verdict: CRIAR a coluna se não existir (ADD COLUMN IF NOT EXISTS não
--          existe em PG 13/14, então usa o bloco dinâmico.)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'agendamentos'
      and column_name = 'deleted_at'
      and table_schema = 'public'
  ) then
    alter table agendamentos
      add column deleted_at timestamptz;
  end if;
end;
$$;

-- 6.2 Mesma verificação: idx_agendamentos_status (migration 0020 linha 18)
--     foi criada com WHERE deleted_at IS NULL. Se tiver sido aplicada depois
--     de deleted_at existir, está OK. Caso contrário, regenera:
drop index if exists idx_agendamentos_status;
create index if not exists idx_agendamentos_status
  on agendamentos (status)
  where deleted_at is null;

-- 6.3 leads.supervisor_id — a migration 0011 não criou índice.
--     Não crítico, mas útil para a tela de gestão filtrar por supervisor.
create index if not exists idx_usuarios_supervisor_novo
  on usuarios (supervisor_id)
  where deleted_at is null and supervisor_id is not null;
--     Note: migration 0021 já criou idx_usuarios_supervisor sem condição NULL.
--     Se ambos existirem, o IF NOT EXISTS impede duplicação.

-- 6.4 Empreendimentos — FK de cliente_id no RLS
--     A migração 0008 criou FK: empreendimento_id references empreendimentos(id)
--     tanto em clientes quanto em agendamentos. OK.

-- 6.5 equipes — FK: gerente_id references usuarios(id). OK.

-- 6.6 usuarios.equipe_id: migration 0021 cria a FK condicionalmente (linha 64–71)
--     que retorna OK.

-- 6.7 documentos.observacoes (vanila) — adicionado pela migração 0023, sem índice
--     trigram. Entretanto, a mesma migração também criou idx_documentos_observacao_trgm.
--     Não tem conflito.

-- 6.8 agendamentos: não tem updated_at trigger configurado.
--     A migration 0000 configura (linha 221). OK.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 7: VALORES DEFAULT FALTANTES
-- ─────────────────────────────────────────────────────────────────────────────

-- 7.1. agendamentos.deleted_at — recém-criado, sem DEFAULT.
--     Não deve ter; o default é NULL (não deletado).

-- 7.2. leads.seguiu — É nullable e sem DEFAULT. Mas é um booleano que denota
--     "o lead seguiu depois da triagem". Pode ser null = ainda n the triagem.
--     Decisão: não alterar, mantém semântica atual.

-- 7.3. Empreendimentos.ativo (BOOL, default true) — OK.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 8: NOT NULLs FALTANTES
-- ─────────────────────────────────────────────────────────────────────────────

-- 8.1. leads.corretor_id — já é NOT NULL.  OK.

-- 8.2. equipes.nome — já é NOT NULL.  OK.

-- 8.3. empreendimentos.nome — NOT NULL.  OK.

-- 8.4. notificacoes.usuario_id, titulo, mensagem — todas NOT NULL. OK.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 9: TABELAS SEM updated_at / deleted_at
-- ─────────────────────────────────────────────────────────────────────────────

-- TABELA            updated_at?   deleted_at?    TRIG_UPDATE?     RLS?
-- ──────────────────────────────────────────────────────────────────────────
-- usuarios           ✅           ✅             ✅ (0000)       ✅ (0000)
-- clientes           ✅           ✅             ✅ (0000)       ✅ (0000)
-- conjuges           ✅           ❌  (tem?)     ✅ (0000)       ✅ (0000)
-- atividades         ❌  (imutable) ❌ (imutable) n/a            ✅ (0000)
-- agendamentos       ✅           ✅ (acima se  ❌ (0000,ma  )
-- comparecimentos    ❌           ❌             ❌              ✅ (0000)
-- documentos         ❌           ✅             ❌              ✅ (0000)
-- producao_diaria    ❌           ❌             ❌              ✅ (0000)
-- historico_acoes    ❌           ❌             ❌              ✅ (0000)
-- empreedimentos     ✅           ✅             ✅ (0008)       ✅ (0008)
-- notificacoes       ❌ (im  ❌ (im    )      ❌              ✅ (0010)
-- leads              ✅           ✅ (sem trig  ✅ (0011)       ✅ (0011)
-- equipes            ✅           ✅             ✅ (0021)       ❌
--
-- Resumo: equipes está sem RLS. Leads tem update_trigger
-- herdado de trg_fn_set_updated_at da 0000 (linha 37, 0011).
--
-- 9.1. EQUIPES SEM RLS → qualquer um autenticado pode ler/escrever!
--     Isso viola a matriz de permissões doc 10 §7.
alter table equipes enable row level security;

create policy equipes_select on equipes for select
  using (is_admin() or auth.uid() = gerente_id
         or exists (select 1 from usuarios
                    where id = auth.uid() and perfil = 'GERENTE' and deleted_at is null));

create policy equipes_insert on equipes for insert
  with check (is_admin());

create policy equipes_update on equipes for update
  using (is_admin() or auth.uid() = gerente_id);

create policy equipes_delete on equipes for delete
  using (is_admin());

-- 9.2. LEAD sem delete_trigger de soft-delete
-- — faltoéteras trigger usado para materl delete rest la tabelas — não é
--   necessário aqui (leads não tem um endpoint da handle de delete).
--   decisão: 1 Solução: criamos a função de soft-delete para consistência.

-- "9.3. AGENDAMENTOS agora tem deleted_at (criado 6.1 acima)
--     Falta um trigger de autura e soft-delete. Delega_ a aplicação usar
--     aquele padrão de todos os outros módulos: o delete no app seta
--     deleted_at = now() e o RLS filtra WHERE deleted_at IS NULL.
--     As políticas RLS do agendamento NÃO filtram por deleted_at (criadas
--     antes do conceito de soft-delete) — corrigimos abaixo.
-- drop de políticas existentes e recria com filtro deleted_at IS NULL

-- Agendamentos RLS com deleted_at
drop policy if exists agendamentos_select on agendamentos;
drop policy if exists agendamentos_write on agendamentos;
drop policy if exists agendamentos_update on agendamentos;

create policy agendamentos_select_gd on agendamentos for select using (
  deleted_at is null
  and (is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id))
);

create policy agendamentos_insert_gd on agendamentos for insert with check (
  deleted_at is null
  and (is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id))
);

create policy agendamentos_update_gd on agendamentos for update using (
  deleted_at is null
  and (is_admin() or corretor_id = auth.uid() or e_gerente_de(corretor_id))
);

-- 9.4 COMPARECIMENTOS: sem trigger de updated_at nem coluna updated_at
--     — as políticas RLS dele já são pós-materia (comparecimento_all) e
--       não filram por delete_at (comparecimentos não tem). Está OK porque
--       a deleção do agendamento, se existe deleted_at, não se propaga a
--       comparecimentos.
--     — decisão: deixa como está; comparecimentos é´específico, vêm de um
--       agendamento e não têm ciclo de vida deletável por fora.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 10: CORREÇÃO DE CONSISTÊNCIA ENTRE AGENDAMENTOS E 0020
-- ─────────────────────────────────────────────────────────────────────────────
-- A migration 0020 criou idx_agendamentos_status (WHERE deleted_at IS NULL
-- mas não há coluna) e idx_agendamentos_observacao_trgm.
-- OWHERE sem coluna é corrigido em 6.2 acima.
-- Não foi mencionado trigger de observação de Auditorial em agendamentos
-- — já temos (migração 0000 linha 357). OK.
-- ─────────────────────────────────────────────────────────────────────────────