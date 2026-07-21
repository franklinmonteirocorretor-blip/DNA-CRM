-- ==========================================================================
-- DNA CRM — Sprint 2: Módulo Agenda (migration 0020)
-- Adiciona colunas 'local' e 'observacao' na tabela agendamentos
-- para suportar o módulo de Agenda profissional.
-- ==========================================================================

-- 1. Adiciona coluna 'local' (onde será a visita/compromisso)
alter table agendamentos
  add column if not exists local text;

-- 2. Adiciona coluna 'observacao' (notas do agendamento)
alter table agendamentos
  add column if not exists observacao text;

-- 3. Novo índice para consultas por status (filtros da agenda)
create index if not exists idx_agendamentos_status
  on agendamentos (status)
  where deleted_at is null;

-- 4. Novo índice composto para busca textual na observacao
create index if not exists idx_agendamentos_observacao_trgm
  on agendamentos using gin (observacao gin_trgm_ops)
  where observacao is not null;

-- 5. Atualiza os tipos TypeScript manualmente (src/types/index.ts)
-- NOTA: esta migration apenas altera o banco; os tipos devem ser
-- atualizados separadamente no código fonte.

-- 6. (Opcional) Backfill: copia observacao da atividade associada mais recente
-- para o campo observacao do agendamento, quando existir
update agendamentos a
set observacao = (
  select ativ.observacao
  from atividades ativ
  where ativ.cliente_id = a.cliente_id
    and ativ.resultado = 'Visita agendada'
    and ativ.created_at >= a.created_at
    and ativ.created_at <= a.created_at + interval '5 minutes'
  order by ativ.created_at desc
  limit 1
)
where a.observacao is null;

-- NOTA DE USO:
-- Ao criar um agendamento, agora deve-se popular os campos:
--   local       => texto livre (ex: "Plantão de Vendas - Shopping X")
--   observacao  => notas relevantes sobre o agendamento
-- O campo observacao da atividade automática continua existindo
-- como registro de auditoria separado.