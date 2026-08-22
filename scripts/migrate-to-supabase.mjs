import { createClient } from "@supabase/supabase-js";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index);
    if (!process.env[key]) process.env[key] = line.slice(index + 1);
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórios.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sqlite = new DatabaseSync(path.join(process.cwd(), "data", "monteiro-crm.db"), {
  readOnly: true,
});

const tables = [
  "clients",
  "builders",
  "projects",
  "client_events",
  "appointments",
  "lead_imports",
  "client_sources",
  "notifications",
  "daily_portfolios",
  "sales",
];

const exists = (table) =>
  Boolean(sqlite.prepare("select name from sqlite_master where type='table' and name=?").get(table));

function normalize(table, row) {
  const clean = { ...row };
  if (table === "builders" || table === "projects") clean.active = Boolean(clean.active);
  for (const [column, value] of Object.entries(clean)) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      clean[column] = `${value.replace(" ", "T")}Z`;
    }
  }
  return clean;
}

async function upsertRows(table, rows) {
  for (let start = 0; start < rows.length; start += 250) {
    const batch = rows.slice(start, start + 250).map((row) => normalize(table, row));
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const report = {};
for (const table of tables) {
  if (!exists(table)) {
    report[table] = { local: 0, remote: 0 };
    continue;
  }
  const rows = sqlite.prepare(`select * from ${table}`).all();
  await upsertRows(table, rows);
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  report[table] = { local: rows.length, remote: count ?? 0 };
}

if (exists("documents")) {
  const rows = sqlite.prepare("select * from documents").all();
  const migrated = [];
  for (const row of rows) {
    const source = String(row.storage_path || "");
    if (!source || !fs.existsSync(source)) continue;
    const objectPath = `${row.client_id ?? "sem-cliente"}/${path.basename(source)}`;
    const { error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_DOCUMENTS_BUCKET || "crm-documentos")
      .upload(objectPath, fs.readFileSync(source), {
        contentType: row.mime_type || "application/pdf",
        upsert: true,
      });
    if (uploadError) throw new Error(`storage ${objectPath}: ${uploadError.message}`);
    migrated.push({ ...row, storage_path: objectPath });
  }
  await upsertRows("documents", migrated);
  const { count, error } = await supabase.from("documents").select("*", { count: "exact", head: true });
  if (error) throw new Error(`documents: ${error.message}`);
  report.documents = { local: rows.length, uploaded: migrated.length, remote: count ?? 0 };
}

console.log(JSON.stringify(report, null, 2));
