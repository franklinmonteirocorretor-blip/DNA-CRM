#!/usr/bin/env node
/**
 * DNA CRM — MATRIZ FINAL DE SINCRONIZAÇÃO
 * ---------------------------------------------------------------
 * Consulta o banco de produção (schema completo: tabelas, colunas,
 * enums, RPCs, triggers, policies, índices, views) e cruza com o
 * código-fonte (src/) para gerar um relatório de sincronização
 * banco ↔ código.
 *
 * Uso:
 *   node scripts/matriz-sincronizacao.mjs [--out docs/matriz-sincronizacao.md]
 *
 * Exit code: 0 = sem divergências | 1 = há objetos divergentes
 * ---------------------------------------------------------------
 */
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const { Client } = pg

// ---- carrega .env.local ----
const env = {}
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
if (!URL) { console.error('FALHA: NEXT_PUBLIC_SUPABASE_URL ausente no .env.local'); process.exit(1) }
const projectHost = URL.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '')
// SEM credenciais hardcoded: use DATABASE_URL (env ou .env.local) ou
// POSTGRES_PASSWORD + host derivado de NEXT_PUBLIC_SUPABASE_URL.
const DSN = process.env.DATABASE_URL
  ?? env.DATABASE_URL
  ?? (env.POSTGRES_PASSWORD
    ? `postgres://postgres:${encodeURIComponent(env.POSTGRES_PASSWORD)}@db.${projectHost}.supabase.co:5432/postgres`
    : null)

if (!DSN) {
  console.error('FALHA: defina DATABASE_URL (ou POSTGRES_PASSWORD) no .env.local para gerar a matriz')
  process.exit(1)
}

const db = new Client({ connectionString: DSN, ssl: { rejectUnauthorized: false } })
await db.connect()
const q = async (sql, p = []) => (await db.query(sql, p)).rows

// =================================================================
// 1) Coleta do banco
// =================================================================
const tables = (await q(`select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`)).map(r => r.table_name)

const columns = await q(`select table_name, column_name from information_schema.columns
  where table_schema = 'public' order by table_name, ordinal_position`)

const enums = await q(`select t.typname as enum_name, e.enumlabel as value
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' order by t.typname, e.enumsortorder`)

const rpcs = await q(`select p.proname, pg_get_function_result(p.oid) as ret
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
  order by p.proname`)

const triggers = await q(`select tg.tgname, c.relname as table_name, p.proname as fn_name
  from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
  join pg_proc p on p.oid = tg.tgfoid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not tg.tgisinternal order by tg.tgname`)

const policies = await q(`select tablename, policyname, cmd, roles
  from pg_policies where schemaname = 'public' order by tablename, policyname`)

const indexes = await q(`select indexname, tablename from pg_indexes
  where schemaname = 'public' order by tablename, indexname`)

const views = await q(`select table_name from information_schema.views
  where table_schema = 'public' order by table_name`)

// =================================================================
// 2) Coleta do código (src/)
// =================================================================
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p)
  }
  return acc
}
const files = fs.existsSync('src') ? walk('src') : []
let code = ''
for (const f of files) code += fs.readFileSync(f, 'utf8') + '\n'

// tabelas e views usadas via supabase.from(...)
const fromUsed = new Set([...code.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)].map(m => m[1]))
// rpcs via .rpc(...)
const rpcUsed = new Set([...code.matchAll(/\.rpc\(\s*['"]([a-z_0-9]+)['"]/g)].map(m => m[1]))
// colunas: tokens citados em selects/chains supabase
const colTokens = new Set()
for (const m of code.matchAll(/\.select\(\s*['"]([^'"]+)['"]/g)) m[1].split(',').forEach(c => colTokens.add(c.trim()))
for (const m of code.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|ilike|like|order|in|match)\(\s*['"]([a-z_0-9.]+)['"]/g)) colTokens.add(m[1].split('.')[0])
// valores de enum usados (strings uppercase citadas)
const values = new Set([...code.matchAll(/'([A-Z][A-Z_0-9]{2,})'/g)].map(m => m[1]))

// =================================================================
// 3) Montagem da matriz
// =================================================================
const rows = []
const add = (cat, name, codeOk, dbOk, note = '') =>
  rows.push({ cat, name, code: codeOk, db: dbOk, note })

let statusOk = 0, statusDiverge = 0

for (const t of tables) {
  const c = fromUsed.has(t)
  add('tabela', t, c, true)
}
// tabelas referenciadas no código que NÃO existem no banco
for (const t of fromUsed) {
  if (!tables.includes(t) && !views.some(v => v.table_name === t)) {
    add('tabela', `${t} (REFERENCIADA NO CÓDIGO)`, true, false, 'AUSENTE NO BANCO')
  }
}

const colsByTable = {}
for (const c of columns) (colsByTable[c.table_name] ??= []).push(c.column_name)
for (const t of tables) {
  for (const col of (colsByTable[t] ?? [])) {
    add('coluna', `${t}.${col}`, colTokens.has(col), true)
  }
}

const enumMap = {}
for (const e of enums) (enumMap[e.enum_name] ??= []).push(e.value)
for (const [name, vals] of Object.entries(enumMap)) {
  const used = vals.some(v => values.has(v))
  add('enum', `${name} [${vals.join(', ')}]`, used, true)
}

for (const r of rpcs) {
  add('rpc', r.proname, rpcUsed.has(r.proname), true)
}
// RPCs chamadas no código que não existem no banco
for (const r of rpcUsed) {
  if (!rpcs.some(x => x.proname === r)) add('rpc', `${r} (CHAMADA NO CÓDIGO)`, true, false, 'AUSENTE NO BANCO')
}

for (const t of triggers) {
  // triggers não são chamados no código — contrato via migration/schema
  add('trigger', `${t.tgname} → ${t.table_name} (fn: ${t.fn_name})`, null, true, 'n/a no código (banco)')
}

for (const p of policies) {
  const roles = Array.isArray(p.roles) ? p.roles.join(', ') : String(p.roles ?? '')
  add('policy', `${p.tablename}: ${p.policyname} [${p.cmd}] → ${roles}`, null, true, 'n/a no código (RLS no banco)')
}

for (const i of indexes) {
  const isConstraint = /_pkey$|_key$/.test(i.indexname)
  add('indice', `${i.indexname} (${i.tablename})${isConstraint ? ' [constraint]' : ''}`, null, true, 'n/a no código (perf)')
}

for (const v of views) {
  add('view', v.table_name, fromUsed.has(v.table_name), true)
}

// =================================================================
// 4) Renderização Markdown
// =================================================================
const check = (ok) => ok === true ? '✓' : ok === false ? '✗' : '—'

const CAT_LABELS = {
  tabela: '1. Tabelas', coluna: '2. Colunas', enum: '3. Enums',
  rpc: '4. RPCs (functions)', trigger: '5. Triggers',
  policy: '6. Policies (RLS)', indice: '7. Índices', view: '8. Views',
}

const out = []
out.push('# MATRIZ FINAL DE SINCRONIZAÇÃO — DNA CRM')
out.push('')
out.push(`> Gerada por \`scripts/matriz-sincronizacao.mjs\` em **${new Date().toISOString()}** (banco de produção)`)
out.push('>')
out.push('> **Código ✓** = objeto referenciado no código-fonte (`src/`) · **Banco ✓** = existe no banco · **Status**: OK / DIVERGENTE / n/a')
out.push('')
out.push(`## Resumo executivo`)
out.push('')
out.push('| Categoria | Objetos | Banco ✓ | Código ✓ |')
out.push('|---|---|---|---|')
const catCount = {}
for (const r of rows) {
  catCount[r.cat] ??= { total: 0, db: 0, code: 0 }
  catCount[r.cat].total++
  if (r.db) catCount[r.cat].db++
  if (r.code) catCount[r.cat].code++
}
let sumTotal = 0, sumDb = 0, sumCode = 0
for (const [cat, c] of Object.entries(catCount)) {
  sumTotal += c.total; sumDb += c.db; sumCode += c.code
  out.push(`| ${CAT_LABELS[cat]} | ${c.total} | ${c.db} | ${c.code} |`)
}
out.push(`| **TOTAL** | **${sumTotal}** | **${sumDb}** | **${sumCode}** |`)
out.push('')

for (const [cat, label] of Object.entries(CAT_LABELS)) {
  const items = rows.filter(r => r.cat === cat)
  if (!items.length) continue
  out.push(`## ${label} (${items.length})`)
  out.push('')
  out.push('| Objeto | Código | Banco | Status | Nota |')
  out.push('|---|---|---|---|---|')
  for (const r of items) {
    // Semântica do status:
    //  - DIVERGENTE: objeto esperado pelo código não existe no banco (db ✗)
    //  - OK: presente no banco e (usado no código ou contrato exclusivo do banco)
    //  - n/a: presente no banco, sem referência explícita no código (ex.: colunas de metadados)
    let status
    if (r.db === false) status = '**DIVERGENTE**'
    else if (r.code === false) status = 'n/a'
    else status = 'OK'
    if (r.db === false) statusDiverge++; else statusOk++
    out.push(`| \`${r.name}\` | ${check(r.code)} | ${check(r.db)} | ${status} | ${r.note} |`)
  }
  out.push('')
}

out.push('---')
out.push('')
out.push(`**Total de objetos auditados: ${rows.length} · OK: ${statusOk} · DIVERGENTE: ${statusDiverge}**`)
out.push('')

// ---- saída ----
const outArg = process.argv.find(a => a.startsWith('--out='))
const outPath = outArg ? outArg.slice(6) : 'docs/matriz-sincronizacao.md'
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out.join('\n'), 'utf8')
console.log(`Matriz gerada: ${outPath} (${rows.length} objetos, ${statusDiverge} divergências)`)

await db.end()
process.exit(statusDiverge === 0 ? 0 : 1)
