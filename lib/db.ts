import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.CRM_DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "monteiro-crm.db");
const globalDb = globalThis as typeof globalThis & {
  monteiroDb?: DatabaseSync;
};
export const db =
  globalDb.monteiroDb || (globalDb.monteiroDb = new DatabaseSync(dbPath));

db.exec(`
PRAGMA busy_timeout=15000;
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS clients(
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
 email TEXT, sex TEXT, marital_status TEXT, profession TEXT, income REAL,
 region_interest TEXT, origin_type TEXT NOT NULL, origin_detail TEXT,
 funnel_stage TEXT NOT NULL DEFAULT 'Novo lead', finance_stage TEXT NOT NULL DEFAULT 'Não iniciado',
 post_sale_stage TEXT, next_action TEXT, next_action_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS client_events(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 event_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, old_stage TEXT, new_stage TEXT,
 metric_key TEXT, occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, actor TEXT NOT NULL DEFAULT 'Franklin Monteiro'
);
CREATE TABLE IF NOT EXISTS appointments(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER REFERENCES clients(id), kind TEXT NOT NULL,
 starts_at TEXT NOT NULL, ends_at TEXT, status TEXT NOT NULL, outcome TEXT, notes TEXT,
 next_action TEXT, next_action_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS builders(
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL,
 contact_name TEXT, phone TEXT, regions TEXT, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS projects(
 id INTEGER PRIMARY KEY AUTOINCREMENT, builder_id INTEGER NOT NULL REFERENCES builders(id), name TEXT NOT NULL,
 kind TEXT, region TEXT, sale_price REAL NOT NULL, commission_rate REAL NOT NULL DEFAULT 6,
 available_units INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, UNIQUE(builder_id,name)
);
CREATE TABLE IF NOT EXISTS documents(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER REFERENCES clients(id), project_id INTEGER REFERENCES projects(id),
 document_type TEXT NOT NULL, file_name TEXT NOT NULL, storage_path TEXT NOT NULL, mime_type TEXT,
 sha256 TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id), project_id INTEGER NOT NULL REFERENCES projects(id),
 vgv REAL NOT NULL, commission_rate REAL NOT NULL, invoice_discount REAL NOT NULL DEFAULT 0,
 bonus REAL NOT NULL DEFAULT 0, advance REAL NOT NULL DEFAULT 0, received REAL NOT NULL DEFAULT 0,
 status TEXT NOT NULL, closed_at TEXT NOT NULL, payment_date TEXT
);
CREATE TABLE IF NOT EXISTS lead_imports(
 id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL, origin_type TEXT NOT NULL, origin_detail TEXT,
 total_rows INTEGER NOT NULL DEFAULT 0, valid_rows INTEGER NOT NULL DEFAULT 0, duplicate_rows INTEGER NOT NULL DEFAULT 0,
 invalid_rows INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS client_sources(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 origin_type TEXT NOT NULL, origin_detail TEXT, project_interest TEXT, source_file TEXT, source_row TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(client_id,origin_type,origin_detail,project_interest,source_file)
);
CREATE TABLE IF NOT EXISTS notifications(
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER REFERENCES clients(id), kind TEXT NOT NULL,
 title TEXT NOT NULL, body TEXT, due_at TEXT, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clients_stages ON clients(funnel_stage,finance_stage,post_sale_stage);
CREATE INDEX IF NOT EXISTS idx_events_client_date ON client_events(client_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(starts_at,status);
CREATE INDEX IF NOT EXISTS idx_notifications_due ON notifications(read_at,due_at);
`);

for (const migration of [
  "ALTER TABLE clients ADD COLUMN project_interest TEXT",
  "ALTER TABLE clients ADD COLUMN data_quality TEXT NOT NULL DEFAULT 'validado'",
]) {
  try {
    db.exec(migration);
  } catch {}
}

{
  const insertBuilder = db.prepare(
    "INSERT OR IGNORE INTO builders(name,category,contact_name,phone,regions) VALUES(?,?,?,?,?)",
  );
  const insertProject = db.prepare(
    "INSERT INTO projects(builder_id,name,kind,region,sale_price,commission_rate,available_units) VALUES(?,?,?,?,?,?,?)",
  );
  insertBuilder.run(
    "Canopus",
    "Empreendimentos",
    "Marcos Vinícius",
    "86999412208",
    "Timon,Teresina Sudeste",
  );
  insertBuilder.run(
    "MC Engenharia",
    "Casas residenciais",
    "Rafael Monteiro",
    "86998723100",
    "Teresina Leste,Teresina Norte",
  );
  insertBuilder.run(
    "Betacon",
    "Mista",
    "Fernanda Alves",
    "86981127740",
    "Teresina Sul,Altos,Demerval Lobão",
  );
  const canopus = Number(
    db.prepare("SELECT id FROM builders WHERE name='Canopus'").get()?.id,
  );
  const mc = Number(
    db.prepare("SELECT id FROM builders WHERE name='MC Engenharia'").get()?.id,
  );
  const betacon = Number(
    db.prepare("SELECT id FROM builders WHERE name='Betacon'").get()?.id,
  );
  const addProject = (
    ...args: [number, string, string, string, number, number, number]
  ) => {
    try {
      insertProject.run(...args);
    } catch {}
  };
  addProject(
    canopus,
    "Village dos Pássaros II",
    "Condomínio de apartamentos",
    "Timon",
    226500,
    6,
    34,
  );
  addProject(
    canopus,
    "Village Natureza",
    "Condomínio de casas",
    "Timon",
    200500,
    6,
    21,
  );
  addProject(
    canopus,
    "Village Garden II",
    "Condomínio de apartamentos",
    "Teresina Sudeste",
    214000,
    6,
    18,
  );
  addProject(
    mc,
    "Residencial Monte Verde",
    "Casas residenciais",
    "Teresina Leste",
    240000,
    6,
    7,
  );
  addProject(
    mc,
    "Residencial Vale Norte",
    "Casas residenciais",
    "Teresina Norte",
    218000,
    6,
    4,
  );
  addProject(
    betacon,
    "Parque das Flores",
    "Condomínio de casas",
    "Teresina Sul",
    198000,
    4,
    12,
  );
}

{
  const add = db.prepare(
    "INSERT OR IGNORE INTO clients(name,phone,email,sex,marital_status,profession,income,region_interest,origin_type,origin_detail,funnel_stage,finance_stage,next_action,next_action_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  add.run(
    "Nicolle Cristine",
    "5586999964566",
    "nicolle@email.com",
    "Feminino",
    "Casado civil",
    "Autônoma",
    4900,
    "Timon",
    "Lista fria",
    "Canopus",
    "Proposta",
    "Aprovado",
    "Apresentar proposta",
    "2026-08-10T14:00:00",
  );
}

export function logClientEvent(
  clientId: number,
  eventType: string,
  title: string,
  description: string,
  newStage?: string,
  metricKey?: string,
) {
  const client = db
    .prepare("SELECT funnel_stage FROM clients WHERE id=?")
    .get(clientId);
  db.prepare(
    "INSERT INTO client_events(client_id,event_type,title,description,old_stage,new_stage,metric_key) VALUES(?,?,?,?,?,?,?)",
  ).run(
    clientId,
    eventType,
    title,
    description,
    client?.funnel_stage || null,
    newStage || null,
    metricKey || null,
  );
  if (newStage)
    db.prepare(
      "UPDATE clients SET funnel_stage=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(newStage, clientId);
}
