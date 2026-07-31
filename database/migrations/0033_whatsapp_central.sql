-- ==========================================================================
-- DNA CRM — Sprint 15: Central WhatsApp (migration 0033)
-- Cria infraestrutura de conversas/mensagens para WhatsApp.
-- Schema: whatsapp_conversas (conversas vinculadas a clientes)
--         whatsapp_mensagens (mensagens individuais da conversa)
-- ==========================================================================

-- ─── 1. whatsapp_conversas ────────────────────────────────────────────────────

create table whatsapp_conversas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes (id),
  usuario_id      uuid not null references usuarios (id),
  provedor        text not null default 'mock'
                  check (provedor in ('evolution', 'meta', 'zapi', 'green', 'mock')),
  provedor_chat_id text,                      -- ID da conversa no provedor externo
  telefone_cliente text not null,             -- número do cliente (cache, evita join)
  status          text not null default 'aberta'
                  check (status in ('aberta', 'finalizada', 'arquivada')),
  ultima_mensagem_em timestamptz not null default now(),
  total_mensagens int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Índices
create index idx_whatsapp_conversas_cliente
  on whatsapp_conversas (cliente_id, status);
create index idx_whatsapp_conversas_usuario
  on whatsapp_conversas (usuario_id, status);
create index idx_whatsapp_conversas_ultima
  on whatsapp_conversas (ultima_mensagem_em desc)
  where status = 'aberta';

-- ─── 2. whatsapp_mensagens ────────────────────────────────────────────────────

create table whatsapp_mensagens (
  id              uuid primary key default gen_random_uuid(),
  conversa_id     uuid not null references whatsapp_conversas (id) on delete cascade,
  remetente       text not null
                  check (remetente in ('usuario', 'cliente', 'sistema')),
  texto           text not null default '',
  tipo            text not null default 'texto'
                  check (tipo in ('texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'template', 'sticker')),
  media_url       text,                       -- URL do arquivo de mídia (se houver)
  media_type      text,                       -- MIME type da mídia
  template_id     text,                       -- UUID do template usado (se tipo=template)
  template_dados  jsonb,                      -- dados preenchidos no template
  lida            boolean not null default false,
  enviada_em      timestamptz not null default now(),
  entregue_em     timestamptz,                -- confirmação de entrega do provedor
  lida_em         timestamptz                 -- confirmação de leitura do provedor
);

-- Índices
create index idx_whatsapp_mensagens_conversa
  on whatsapp_mensagens (conversa_id, enviada_em desc);
create index idx_whatsapp_mensagens_nao_lidas
  on whatsapp_mensagens (conversa_id)
  where remetente = 'cliente' and lida = false;

-- ─── 3. RLS ───────────────────────────────────────────────────────────────────

alter table whatsapp_conversas enable row level security;
alter table whatsapp_mensagens enable row level security;

-- Conversas: qualquer usuário autenticado pode ver/inserir/atualizar
create policy "whatsapp_conversas_select_auth"
  on whatsapp_conversas for select
  using (auth.role() = 'authenticated');

create policy "whatsapp_conversas_insert_auth"
  on whatsapp_conversas for insert
  with check (auth.role() = 'authenticated');

create policy "whatsapp_conversas_update_auth"
  on whatsapp_conversas for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Mensagens: qualquer usuário autenticado pode ver/inserir
create policy "whatsapp_mensagens_select_auth"
  on whatsapp_mensagens for select
  using (auth.role() = 'authenticated');

create policy "whatsapp_mensagens_insert_auth"
  on whatsapp_mensagens for insert
  with check (auth.role() = 'authenticated');

create policy "whatsapp_mensagens_update_auth"
  on whatsapp_mensagens for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─── 4. Habilitar Realtime ────────────────────────────────────────────────────

alter publication supabase_realtime add table whatsapp_conversas;
alter publication supabase_realtime add table whatsapp_mensagens;

-- ─── 5. Trigger: nova mensagem → atualiza ultima_mensagem_em na conversa ──────

create or replace function trg_fn_wp_atualiza_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update whatsapp_conversas set
    ultima_mensagem_em = new.enviada_em,
    total_mensagens = (
      select count(*) from whatsapp_mensagens where conversa_id = new.conversa_id
    ),
    updated_at = now()
  where id = new.conversa_id;

  return new;
end;
$$;

create trigger trg_wp_mensagem_criada
  after insert on whatsapp_mensagens
  for each row execute function trg_fn_wp_atualiza_conversa();

-- ─── 6. Trigger: nova mensagem do corretor → incrementa produção diária ────────

create or replace function trg_fn_wp_producao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid;
begin
  -- Busca o usuario_id da conversa
  select usuario_id into v_usuario_id from whatsapp_conversas where id = new.conversa_id;

  -- Se a mensagem saiu do corretor (remetente = 'usuario'), incrementa produção
  if new.remetente = 'usuario' and found then
    perform fn_upsert_producao(v_usuario_id, 'whatsapp');
  end if;

  return new;
end;
$$;

create trigger trg_wp_producao
  after insert on whatsapp_mensagens
  for each row
  when (new.remetente = 'usuario')
  execute function trg_fn_wp_producao();