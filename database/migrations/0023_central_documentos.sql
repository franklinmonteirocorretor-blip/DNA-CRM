-- ==========================================================================
-- DNA CRM — Sprint 7: Central de Documentos (migration 0023)
-- Expande enums de documentos e adiciona colunas de rastreamento.
-- ==========================================================================

-- 1. Adiciona novos tipos de documento ao enum existente
do $$
begin
  alter type tipo_documento add value if not exists 'HOLERITE';
  alter type tipo_documento add value if not exists 'CARTEIRA_TRABALHO';
  alter type tipo_documento add value if not exists 'EXTRATO_FGTS';
  alter type tipo_documento add value if not exists 'DECLARACAO_IR';
end;
$$;

-- 2. Adiciona novos status de validacao ao enum existente
do $$
begin
  alter type status_validacao_doc add value if not exists 'RECEBIDO';
  alter type status_validacao_doc add value if not exists 'EM_ANALISE';
end;
$$;

-- 3. Novas colunas na tabela documentos
alter table documentos
  add column if not exists observacoes      text,
  add column if not exists data_aprovacao   timestamptz,
  add column if not exists vencimento       date,
  add column if not exists versao           int not null default 1,
  add column if not exists atualizado_por   uuid references usuarios (id);

-- 4. Trigger: ao atualizar documento (nova versão), incrementa versao
create or replace function fn_documento_versao()
returns trigger as $$
begin
  if new.arquivo_url is distinct from old.arquivo_url then
    new.versao = old.versao + 1;
    new.atualizado_por = auth.uid();
  end if;
  if new.status_validacao = 'VALIDADO' and old.status_validacao is distinct from 'VALIDADO' then
    new.data_aprovacao = coalesce(new.data_aprovacao, now());
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_documento_versao on documentos;
create trigger trg_documento_versao
  before update on documentos
  for each row
  execute function fn_documento_versao();

-- 5. Trigger que atualiza ultima_atividade_em do cliente ao enviar documento
create or replace function fn_documento_atividade_cliente()
returns trigger as $$
begin
  update clientes
    set ultima_atividade_em = now()
  where id = new.cliente_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_documento_atividade_cliente on documentos;
create trigger trg_documento_atividade_cliente
  after insert on documentos
  for each row
  execute function fn_documento_atividade_cliente();

-- 6. Função: verifica se checklist obrigatório está completo para uma etapa
-- Retorna array de tipos de documento faltantes
create or replace function fn_checklist_obrigatorio(
  p_cliente_id uuid,
  p_etapa text
) returns text[] as $$
declare
  obrigatorios text[];
  pendentes text[];
begin
  -- Define docs obrigatórios por etapa
  obrigatorios := case p_etapa
    when 'ANALISE' then array['RG', 'CPF', 'COMPROVANTE_RENDA', 'HOLERITE']
    when 'RESTRICOES' then array['RG', 'CPF', 'COMPROVANTE_RENDA', 'EXTRATO_FGTS', 'CARTEIRA_TRABALHO']
    when 'CONDICIONADOS' then array['RG', 'CPF', 'COMPROVANTE_RENDA', 'HOLERITE', 'EXTRATO_FGTS', 'DECLARACAO_IR']
    when 'APROVADOS' then array['RG', 'CPF', 'COMPROVANTE_RENDA', 'COMPROVANTE_ENDERECO']
    when 'FECHAMENTOS' then array['RG', 'CPF', 'COMPROVANTE_RENDA', 'COMPROVANTE_ENDERECO', 'CERTIDAO_NASCIMENTO', 'CERTIDAO_CASAMENTO']
    else array[]::text[]
  end;

  -- Verifica quais obrigatórios estão PENDENTE ou REJEITADO (não VALIDADO)
  select array_agg(tipo)
  from (
    select unnest(obrigatorios) as tipo
    except
    select tipo
    from documentos
    where cliente_id = p_cliente_id
      and deleted_at is null
      and status_validacao = 'VALIDADO'
      and tipo = any(obrigatorios)
  ) faltantes
  into pendentes;

  return coalesce(pendentes, array[]::text[]);
end;
$$ language plpgsql stable security definer;

-- 7. Índice para consultas por vencimento
create index if not exists idx_documentos_vencimento
  on documentos (vencimento)
  where deleted_at is null and vencimento is not null;

-- 8. Índice para consultas por observacao (trigram)
-- [FIX] Coluna real é observacoes (plural)
create index if not exists idx_documentos_observacao_trgm
  on documentos using gin (observacoes gin_trgm_ops)
  where observacoes is not null;