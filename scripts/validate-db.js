const { Client } = require("pg");
// Credencial via ambiente (nunca hardcoded). Veja .env.example.
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("FALHA: defina DATABASE_URL no ambiente (ver .env.local)");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  let allOK = true;
  
  try {
    await client.connect();
    console.log("[*] FASE 3: VALIDACAO DO BANCO\n");

    // 1. Verificar constraints CHECK
    const checks = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conrelid = 'clientes'::regclass 
        AND contype = 'c'
        AND conname LIKE '%comissao%'
    `);
    console.log("1. CHECK CONSTRAINTS:");
    for (const c of checks.rows) console.log("   " + c.conname + ": " + c.def);

    // 2. Verificar triggers
    const triggers = await client.query(`
      SELECT tgname, tgtype::text, tgenabled
      FROM pg_trigger 
      WHERE tgrelid = 'clientes'::regclass 
        AND tgname LIKE '%comissao%'
    `);
    console.log("\n2. TRIGGERS:");
    for (const t of triggers.rows) console.log("   " + t.tgname + " (tgenabled=" + t.tgenabled + ")");

    // 3. Verificar RLS
    const rls = await client.query(`SELECT relrowsecurity FROM pg_class WHERE relname = 'clientes'`);
    console.log("\n3. RLS ativo em clientes:", rls.rows[0]?.relrowsecurity === true ? "SIM" : "NAO");

    // 4. Verificar todos os indices da tabela
    const idx = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'clientes'
      ORDER BY indexname
    `);
    console.log("\n4. INDICES em clientes (" + idx.rows.length + "):");
    for (const i of idx.rows) console.log("   " + i.indexname);

    // 5. Verificar que nenhuma coluna foi perdida
    const beforeCols = ['id','nome','email','telefone','cpf','corretor_responsavel_id','empreendimento_id','data_nascimento','dependentes','ficha_proposta_assinada','data_fechamento','vgv','comissao_percentual','comissao_valor','deleted_at','created_at','updated_at','empreendimento_interesse'];
    for (const col of beforeCols) {
      const r = await client.query(`
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND table_schema='public' AND column_name=$1)`,
        [col]
      );
      if (!r.rows[0].exists) {
        console.log("   MISSING COLUMN:", col);
        allOK = false;
      }
    }

    // 6. Verificar novas colunas COM DADOS
    const newCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clientes' 
        AND table_schema = 'public'
        AND column_name IN ('comissao_status','comissao_data_prevista','comissao_data_recebimento')
      ORDER BY ordinal_position
    `);
    console.log("\n5. NOVAS COLUNAS:");
    for (const c of newCols.rows) console.log("   " + c.column_name + " (" + c.data_type + ", " + c.is_nullable + ")");

    // 7. Teste rápido: select nas novas colunas
    const test = await client.query("SELECT comissao_status, comissao_data_prevista, comissao_data_recebimento FROM clientes LIMIT 1");
    console.log("\n6. TEST QUERY: " + (test.rows.length > 0 ? "OK - data=" + JSON.stringify(test.rows[0]) : "OK - sem dados"));
    
    // 8. Verificar view ou dependencias que poderiam quebrar
    const views = await client.query(`
      SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname ILIKE '%financeiro%'
    `);
    console.log("\n7. Views financeiras:", views.rows.length > 0 ? views.rows.map(v=>v.viewname).join(", ") : "Nenhuma");

    // 9. Verificar RLS policies que mencionam comissao
    const policies = await client.query(`
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'clientes'
    `);
    console.log("\n8. RLS policies:");
    for (const p of policies.rows) console.log("   " + p.policyname + " (" + p.cmd + ")");

    console.log("\n[*] RESULTADO:", allOK ? "TODOS OS TESTES PASSARAM" : "FALHAS ENCONTRADAS");

  } finally {
    await client.end();
  }
}
main().catch(e => console.error("FATAL:", e.message));