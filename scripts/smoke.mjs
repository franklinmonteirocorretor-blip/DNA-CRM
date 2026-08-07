#!/usr/bin/env node
/**
 * DNA CRM — SMOKE TEST PERMANENTE
 * ---------------------------------------------------------------
 * Valida a sincronização banco ↔ código de ponta a ponta, chamando
 * RPCs e tabelas EXATAMENTE como o app faz (mesmas queries do código).
 *
 * Uso:
 *   node scripts/smoke.mjs            # modo completo (tudo)
 *   node scripts/smoke.mjs --db       # conectividade, tabelas, colunas
 *   node scripts/smoke.mjs --schema   # RPCs, triggers, enums, views, índices
 *   node scripts/smoke.mjs --security # RLS, anon bloqueado, roles
 *
 * Exit code: 0 = tudo OK | 1 = ao menos 1 falha
 *
 * Requisitos: .env.local com NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.
 * ---------------------------------------------------------------
 */
import fs from 'fs'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Client } = pg

// ---- carrega .env.local (parse simples, suporta aspas) ----
const env = {}
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('FALHA: variáveis de ambiente ausentes no .env.local')
  process.exit(1)
}

// ---- conexão direta (role postgres) para asserts de estado ----
// SEM credenciais hardcoded: use DATABASE_URL (env ou .env.local) ou
// POSTGRES_PASSWORD + host derivado de NEXT_PUBLIC_SUPABASE_URL.
const projectHost = URL.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '')
const DSN = process.env.DATABASE_URL
  ?? env.DATABASE_URL
  ?? (env.POSTGRES_PASSWORD
    ? `postgres://postgres:${encodeURIComponent(env.POSTGRES_PASSWORD)}@db.${projectHost}.supabase.co:5432/postgres`
    : null)

if (!DSN) {
  console.error('FALHA: defina DATABASE_URL (ou POSTGRES_PASSWORD) no .env.local para o smoke direto')
  process.exit(1)
}

const sb = createClient(URL, SERVICE_KEY)
const db = new Client({ connectionString: DSN, ssl: { rejectUnauthorized: false } })
await db.connect()

// ---- runner com categorias ----
const CATS = new Set(['db', 'schema', 'security'])
const args = process.argv.slice(2)
const modos = args.length === 0 ? new Set(CATS) : new Set(args.filter(a => a.startsWith('--')).map(a => a.slice(2)).filter(m => CATS.has(m)))

let pass = 0, fail = 0
const t = async (cat, label, fn) => {
  if (!modos.has(cat)) return
  try {
    await fn()
    console.log(`  OK  [${cat}] ${label}`)
    pass++
  } catch (e) {
    console.log(` FALHA [${cat}] ${label}: ${e.message}`)
    fail++
  }
}
const dbq = async (sql, params = []) => (await db.query(sql, params)).rows

// =================================================================
console.log('== DB: conectividade e estrutura ==')
await t('db', 'conexão postgres direta', async () => {
  const r = await dbq('select 1 as ok')
  if (r[0].ok !== 1) throw new Error('select 1 falhou')
})

// Tabelas núcleo + novas, legíveis via service role (como o app)
// Lista derivada do código real (src/) — qualquer tabela aqui é referenciada pelo app.
const TABELAS_APP = [
  'usuarios', 'clientes', 'conjuges', 'atividades', 'agendamentos',
  'comparecimentos', 'documentos', 'producao_diaria', 'empreendimentos',
  'notificacoes', 'historico_acoes', 'equipes', 'automacao_tarefas',
  'whatsapp_conversas', 'whatsapp_mensagens', 'copiloto_memoria',
  'automacoes_fila', 'automacoes', 'automacoes_log', 'swe_bench_evaluations',
]
for (const table of TABELAS_APP) {
  await t('db', `select ${table} (service role)`, async () => {
    const { data, error } = await sb.from(table).select('*').limit(1)
    if (error) throw new Error(error.message)
    if (!Array.isArray(data)) throw new Error('resposta não é array')
  })
}

await t('db', 'usuarios: status_usuario + ultima_atividade_em', async () => {
  const { data, error } = await sb.from('usuarios').select('id, status_usuario, ultima_atividade_em').limit(5)
  if (error) throw new Error(error.message)
  const bad = data.filter(u => !u.status_usuario)
  if (bad.length > 0) throw new Error('status_usuario null em registros existentes (backfill?)')
})

await t('db', 'clientes: tempo_etapas + entrou_etapa_em', async () => {
  const { data, error } = await sb.from('clientes').select('id, tempo_etapas, entrou_etapa_em').limit(3)
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})

await t('db', 'documentos: colunas de sincronização', async () => {
  const { data, error } = await sb.from('documentos')
    .select('id, observacoes, data_aprovacao, vencimento, versao, atualizado_por').limit(3)
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})

await t('db', 'agendamentos: local + observacao', async () => {
  const { data, error } = await sb.from('agendamentos').select('id, local, observacao').limit(3)
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})

await t('db', 'swe_bench_evaluations: colunas da rota /swe-bench', async () => {
  const { data, error } = await sb.from('swe_bench_evaluations')
    .select('id, model_name, benchmark_type, resolved_rate, avg_time_seconds, total_tasks, pass_k, date_added, metadata, updated_at')
    .limit(3)
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})

// =================================================================
console.log('== SCHEMA: RPCs, triggers, enums, views, índices ==')
await t('schema', 'RPC fn_tempo_medio_etapas()', async () => {
  const { data, error } = await sb.rpc('fn_tempo_medio_etapas')
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})
await t('schema', 'RPC fn_vgv_por_etapa()', async () => {
  const { data, error } = await sb.rpc('fn_vgv_por_etapa')
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})
await t('schema', 'RPC fn_automacao_claim_fila(p_limit)', async () => {
  const { data, error } = await sb.rpc('fn_automacao_claim_fila', { p_limit: 5 })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error('resposta não é array')
})
await t('schema', 'RPC fn_automacao_dispatch', async () => {
  const { error } = await sb.rpc('fn_automacao_dispatch', {
    p_evento: '_smoke_test', p_entidade: 'cliente',
    p_entidade_id: '00000000-0000-0000-0000-000000000000', p_payload: {},
  })
  if (error) throw new Error(error.message)
  await dbq(`delete from automacoes_fila where evento = '_smoke_test'`)
})
await t('schema', 'RPC registrar_auditoria_auto', async () => {
  const { error } = await sb.rpc('registrar_auditoria_auto', {
    p_entidade: '_smoke_test', p_entidade_id: '00000000-0000-0000-0000-000000000001',
    p_acao: 'CRIACAO', p_observacao: 'smoke test',
  })
  if (error) throw new Error(error.message)
  await dbq(`delete from historico_acoes where entidade = '_smoke_test'`)
})

await t('schema', 'trigger 0036: atividade toca usuarios.ultima_atividade_em', async () => {
  const user = (await dbq(
    `select id from usuarios where perfil in ('CORRETOR','GERENTE','ADMINISTRADOR') order by created_at limit 1`
  ))[0]
  if (!user) throw new Error('nenhum usuário encontrado')
  const cli = (await dbq(`select id from clientes where deleted_at is null limit 1`))[0]
  const cliId = cli?.id ?? (await dbq(`select id from clientes limit 1`))[0]?.id
  const antes = (await dbq(`select ultima_atividade_em from usuarios where id = $1`, [user.id]))[0].ultima_atividade_em
  const atv = (await dbq(
    `insert into atividades (cliente_id, usuario_id, tipo, resultado) values ($1,$2,'LIGACAO','smoke test') returning id`,
    [cliId, user.id]
  ))[0].id
  const depois = (await dbq(`select ultima_atividade_em from usuarios where id = $1`, [user.id]))[0].ultima_atividade_em
  await dbq(`delete from atividades where id = $1`, [atv])
  if (!depois || (antes && antes.getTime() === depois.getTime())) {
    throw new Error(`não atualizou (antes=${antes}, depois=${depois})`)
  }
})

await t('schema', 'trigger 0022: mudança de etapa registra tempo_etapas', async () => {
  const cli = (await dbq(
    `select id, etapa_atual, tempo_etapas, entrou_etapa_em from clientes where deleted_at is null limit 1`
  ))[0]
  if (!cli) { console.log('      (sem clientes — skip)'); return }
  const novaEtapa = cli.etapa_atual === 'CONTATOS' ? 'NOVO_LEAD' : 'CONTATOS'
  await dbq(`update clientes set etapa_atual = $1::etapa_funil where id = $2`, [novaEtapa, cli.id])
  const depois = (await dbq(`select tempo_etapas, entrou_etapa_em from clientes where id = $1`, [cli.id]))[0]
  await dbq(`update clientes set etapa_atual = $1::etapa_funil where id = $2`, [cli.etapa_atual, cli.id])
  if (!depois.entrou_etapa_em) throw new Error('entrou_etapa_em não atualizado')
})

await t('schema', 'enums do projeto existem', async () => {
  const r = await dbq(`select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e' order by t.typname`)
  const esperados = ['etapa_funil', 'status_usuario', 'status_agendamento', 'resultado_comparecimento']
  const ausentes = esperados.filter(e => !r.some(x => x.typname === e))
  if (ausentes.length) throw new Error(`enums ausentes: ${ausentes.join(', ')}`)
})

await t('schema', 'índices críticos existem', async () => {
  const r = await dbq(`select indexname from pg_indexes where schemaname = 'public'`)
  const esperados = ['equipes_nome_unico', 'idx_usuarios_ultima_atividade', 'idx_documentos_observacao_trgm']
  const ausentes = esperados.filter(e => !r.some(x => x.indexname === e))
  if (ausentes.length) throw new Error(`índices ausentes: ${ausentes.join(', ')}`)
})

// =================================================================
console.log('== SECURITY: RLS e roles ==')
const TABELAS_RLS = ['equipes', 'automacao_tarefas', 'whatsapp_conversas', 'whatsapp_mensagens', 'copiloto_memoria']
for (const table of TABELAS_RLS) {
  await t('security', `anon bloqueado em ${table}`, async () => {
    const anon = createClient(URL, ANON_KEY)
    const { data, error } = await anon.from(table).select('*').limit(1)
    if (!error && data && data.length > 0) throw new Error('anon leu registros')
  })
}
await t('security', 'anon bloqueado em usuarios (RLS)', async () => {
  const anon = createClient(URL, ANON_KEY)
  const { data } = await anon.from('usuarios').select('*').limit(1)
  if (data && data.length > 0) throw new Error('anon leu usuarios')
})

console.log(`\nSMOKE TEST: ${pass} OK, ${fail} FALHA  (modos: ${[...modos].join(', ') || 'nenhum'})`)
await db.end()
process.exit(fail === 0 ? 0 : 1)
