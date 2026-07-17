-- ============================================================================
-- DNA CRM — Migração 0016: ranking público da Central de Operações (Sprint 2)
-- O RLS (correto) impede o corretor de ler producao_diaria dos colegas, mas o
-- ranking é gamificação: todos precisam ver o AGREGADO público. Esta função
-- security definer expõe somente nome, pontos e totais — nunca dados brutos.
-- ============================================================================

create or replace function fn_ranking_mes()
returns table (
  usuario_id uuid,
  nome       text,
  pontos     numeric,
  vendas     bigint,
  producao   bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.nome,
    coalesce(sum(p.pontuacao_gamificacao), 0)            as pontos,
    coalesce(sum(p.vendas), 0)                           as vendas,
    coalesce(sum(p.ligacoes + p.whatsapp + p.follow_ups
                 + p.agendamentos + p.comparecimentos
                 + p.pastas), 0)                         as producao
  from usuarios u
  left join producao_diaria p
    on p.usuario_id = u.id
   and p.data >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
  where u.ativo and u.deleted_at is null
  group by u.id, u.nome
  order by pontos desc, vendas desc, producao desc;
$$;

revoke all on function fn_ranking_mes() from public;
grant execute on function fn_ranking_mes() to authenticated;
