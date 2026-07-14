-- ============================================================================
-- DNA CRM — Migração 0010: Notificações em Tempo Real
-- Tabela de notificações + função geradora + triggers nos eventos principais.
-- ============================================================================

-- ── 1. Tipo enum para categoria de notificação ───────────────────────────────
create type tipo_notificacao as enum (
  'CLIENTE_PARADO',
  'AGENDAMENTO_HOJE',
  'AGENDAMENTO_AMANHA',
  'DOCUMENTO_PENDENTE',
  'POS_VENDA_PRAZO',
  'FECHAMENTO_REALIZADO',
  'ANALISE_CONCLUIDA'
);

-- ── 2. Tabela notificacoes ───────────────────────────────────────────────────
create table notificacoes (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuarios (id),
  tipo          tipo_notificacao not null,
  titulo        text not null,
  mensagem      text not null,
  link          text,
  lida          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_notificacoes_usuario_lida on notificacoes (usuario_id, lida, created_at desc);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
alter table notificacoes enable row level security;

create policy "notificacoes_select_owner"
  on notificacoes for select
  using (auth.uid() = usuario_id);

create policy "notificacoes_update_owner"
  on notificacoes for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "notificacoes_insert_system"
  on notificacoes for insert
  with check (true); -- triggers rodam como security definer

-- ── 4. Habilitar Realtime para a tabela ──────────────────────────────────────
alter publication supabase_realtime add table notificacoes;

-- ── 5. Função geradora de notificações ───────────────────────────────────────
-- Processa todos os alertas pendentes e insere notificações para cada corretor.
-- Deve ser chamada periodicamente (ex: a cada 5 minutos via pg_cron)
-- ou sob demanda via trigger em eventos importantes.
create or replace function gerar_notificacoes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  corretor record;
  notif_count int;
begin
  -- Limpa notificações antigas não lidas (mais de 7 dias) para evitar acúmulo
  delete from notificacoes
  where lida = false
    and created_at < now() - interval '7 days';

  for corretor in
    select id, nome from usuarios
    where perfil = 'CORRETOR' and ativo = true and deleted_at is null
  loop
    notif_count := 0;

    -- 5.1 Clientes parados há 5+ dias (etapas ativas)
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'CLIENTE_PARADO',
      'Cliente sem contato',
      c.nome || ' está há ' ||
        extract(day from now() - c.ultima_atividade_em)::int || ' dias sem atividade.',
      '/dashboard/clientes/' || c.id
    from clientes c
    where c.corretor_responsavel_id = corretor.id
      and c.deleted_at is null
      and c.etapa_atual in ('NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO')
      and c.ultima_atividade_em < now() - interval '5 days'
      -- Não insere se já existe notificação não lida desse tipo para este cliente
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'CLIENTE_PARADO'
          and n.link = '/dashboard/clientes/' || c.id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;

    get diagnostics notif_count = row_count;

    -- 5.2 Agendamentos para hoje
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'AGENDAMENTO_HOJE',
      'Visita hoje',
      coalesce(cl.nome, 'Cliente') || ' às ' ||
        to_char(a.data_hora, 'HH24:MI') ||
        coalesce(' — ' || a.empreendimento_interesse, ''),
      '/dashboard/clientes/' || a.cliente_id
    from agendamentos a
    join clientes cl on cl.id = a.cliente_id
    where a.corretor_id = corretor.id
      and a.data_hora >= current_date
      and a.data_hora < current_date + interval '1 day'
      and a.status = 'AGENDADO'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'AGENDAMENTO_HOJE'
          and n.link = '/dashboard/clientes/' || a.cliente_id
          and n.lida = false
          and n.created_at > current_date
      )
    limit 3;

    -- 5.3 Agendamentos para amanhã
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'AGENDAMENTO_AMANHA',
      'Visita amanhã',
      coalesce(cl.nome, 'Cliente') || ' às ' ||
        to_char(a.data_hora, 'HH24:MI') ||
        coalesce(' — ' || a.empreendimento_interesse, ''),
      '/dashboard/clientes/' || a.cliente_id
    from agendamentos a
    join clientes cl on cl.id = a.cliente_id
    where a.corretor_id = corretor.id
      and a.data_hora >= current_date + interval '1 day'
      and a.data_hora < current_date + interval '2 days'
      and a.status = 'AGENDADO'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'AGENDAMENTO_AMANHA'
          and n.link = '/dashboard/clientes/' || a.cliente_id
          and n.lida = false
          and n.created_at > current_date
      )
    limit 3;

    -- 5.4 Documentos pendentes
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'DOCUMENTO_PENDENTE',
      'Documento pendente',
      cl.nome || ' — ' || d.tipo || ' aguardando validação.',
      '/dashboard/clientes/' || d.cliente_id
    from documentos d
    join clientes cl on cl.id = d.cliente_id
    where cl.corretor_responsavel_id = corretor.id
      and d.status_validacao = 'PENDENTE'
      and d.deleted_at is null
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'DOCUMENTO_PENDENTE'
          and n.link = '/dashboard/clientes/' || d.cliente_id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;

    -- 5.5 Pós-venda com prazo vencendo
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    select
      corretor.id,
      'POS_VENDA_PRAZO',
      'Prazo de pós-venda',
      cl.nome || ' — ' || coalesce(cl.proxima_acao, 'ação pendente') ||
        case
          when cl.proxima_acao_em < now() then ' (VENCIDO)'
          when cl.proxima_acao_em < now() + interval '3 days' then ' (próximo)'
          else ''
        end,
      '/dashboard/clientes/' || cl.id
    from clientes cl
    where cl.corretor_responsavel_id = corretor.id
      and cl.deleted_at is null
      and cl.etapa_atual = 'POS_VENDA'
      and cl.proxima_acao_em is not null
      and cl.proxima_acao_em < now() + interval '3 days'
      and not exists (
        select 1 from notificacoes n
        where n.usuario_id = corretor.id
          and n.tipo = 'POS_VENDA_PRAZO'
          and n.link = '/dashboard/clientes/' || cl.id
          and n.lida = false
          and n.created_at > now() - interval '24 hours'
      )
    limit 3;
  end loop;
end;
$$;

-- ── 6. Trigger em fechamentos (notificação imediata) ─────────────────────────
create or replace function notificar_fechamento()
returns trigger as $$
begin
  -- Só notifica quando ficha_proposta_assinada muda de false para true
  if new.ficha_proposta_assinada = true
     and (old.ficha_proposta_assinada = false or old.ficha_proposta_assinada is null) then
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    values (
      new.corretor_responsavel_id,
      'FECHAMENTO_REALIZADO',
      'Fechamento realizado!',
      new.nome || ' assinou a ficha proposta.',
      '/dashboard/clientes/' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notificar_fechamento
  after update on clientes
  for each row execute function notificar_fechamento();

-- ── 7. Trigger em análise concluída ──────────────────────────────────────────
create or replace function notificar_analise()
returns trigger as $$
begin
  if new.resultado_analise is not null
     and (old.resultado_analise is null or old.resultado_analise <> new.resultado_analise) then
    insert into notificacoes (usuario_id, tipo, titulo, mensagem, link)
    values (
      new.corretor_responsavel_id,
      'ANALISE_CONCLUIDA',
      'Análise concluída',
      new.nome || ' — Resultado: ' || new.resultado_analise,
      '/dashboard/clientes/' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notificar_analise
  after update on clientes
  for each row execute function notificar_analise();