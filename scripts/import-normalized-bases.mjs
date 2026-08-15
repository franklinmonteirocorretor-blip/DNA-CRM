import fs from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";

const input=process.argv[2];
if(!input||!fs.existsSync(input))throw new Error("Informe o arquivo JSON normalizado.");
const payload=JSON.parse(fs.readFileSync(input,"utf8"));
const dataDir=process.env.CRM_DATA_DIR||path.join(process.cwd(),"data");
fs.mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,"monteiro-crm.db"));
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=15000;");
for(const migration of ["ALTER TABLE clients ADD COLUMN project_interest TEXT","ALTER TABLE clients ADD COLUMN data_quality TEXT NOT NULL DEFAULT 'validado'"]){try{db.exec(migration)}catch{}}
db.exec(`CREATE TABLE IF NOT EXISTS client_sources(id INTEGER PRIMARY KEY AUTOINCREMENT,client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,origin_type TEXT NOT NULL,origin_detail TEXT,project_interest TEXT,source_file TEXT,source_row TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(client_id,origin_type,origin_detail,project_interest,source_file));`);
const find=db.prepare("SELECT id,origin_type,origin_detail FROM clients WHERE phone=?");
const insert=db.prepare("INSERT INTO clients(name,phone,email,origin_type,origin_detail,project_interest,funnel_stage,finance_stage,next_action,data_quality) VALUES(?,?,?,?,?,?, 'Novo lead','Não iniciado','Realizar primeiro contato D0',?)");
const update=db.prepare("UPDATE clients SET name=CASE WHEN length(name)<length(?) THEN ? ELSE name END,email=COALESCE(email,?),origin_type=CASE WHEN origin_type='Lead' OR ?<>'Lead' THEN origin_type ELSE 'Lead' END,project_interest=CASE WHEN project_interest IS NULL OR project_interest='' THEN ? ELSE project_interest END,updated_at=CURRENT_TIMESTAMP WHERE id=?");
const source=db.prepare("INSERT OR IGNORE INTO client_sources(client_id,origin_type,origin_detail,project_interest,source_file,source_row) VALUES(?,?,?,?,?,?)");
const event=db.prepare("INSERT INTO client_events(client_id,event_type,title,description,metric_key) VALUES(?,?,?,?,?)");
let created=0,updated=0;
db.exec("BEGIN IMMEDIATE");
try{
 for(const row of payload.rows){let existing=find.get(row.phone);let id;if(existing){id=Number(existing.id);update.run(row.name,row.name,row.email,row.originType,row.projectInterest,id);updated++}else{const result=insert.run(row.name,row.phone,row.email,row.originType,row.originDetail,row.projectInterest,row.name.startsWith("Contato ")?"nome_ausente":"validado");id=Number(result.lastInsertRowid);created++;event.run(id,"IMPORT","Contato importado",`Origem: ${row.originDetail}. Interesse: ${row.projectInterest||"não informado"}.`,"new_contact")}
  for(const origin of row.origins)source.run(id,"Lista fria",origin,row.projectInterest,row.sourceRows[0]?.split(":")[0]||null,row.sourceRows.join(","));
 }
 db.prepare("INSERT INTO lead_imports(file_name,origin_type,origin_detail,total_rows,valid_rows,duplicate_rows,invalid_rows) VALUES(?,?,?,?,?,?,?)").run("3 bases iniciais consolidadas","Lista fria","Bases Village + Lista DNA",5433,payload.rows.length,842,5433-payload.rows.length);
 db.exec("COMMIT");
}catch(error){db.exec("ROLLBACK");throw error}
console.log(JSON.stringify({created,updated,total:payload.rows.length},null,2));
