import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type RawRow = Record<string, string>;
type ContactRow = { name:string; phone:string; email:string; project:string; builder:string; raw:RawRow };

const clean = (value: unknown) => String(value ?? "").trim();
const key = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const phone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
};
const email = (value: string) => value.trim().toLowerCase();
const pick = (row: RawRow, names: string[]) => {
  const found = Object.entries(row).find(([header]) => names.includes(key(header)));
  return clean(found?.[1]);
};

function parseDelimited(text: string) {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = [";", ",", "\t"].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (line:string) => {
    const values:string[]=[]; let current=""; let quoted=false;
    for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++}else quoted=!quoted}else if(char===delimiter&&!quoted){values.push(current);current=""}else current+=char}values.push(current);return values;
  };
  const headers=split(lines.shift()||"");
  return lines.map(line=>Object.fromEntries(split(line).map((value,index)=>[headers[index]||`coluna_${index+1}`,value])));
}

async function parseFile(file: File): Promise<RawRow[]> {
  const buffer=Buffer.from(await file.arrayBuffer());
  const extension=file.name.split(".").pop()?.toLowerCase();
  if(extension==="csv"||extension==="txt") return parseDelimited(buffer.toString("utf8").replace(/^\uFEFF/,""));
  if(extension==="xlsx"){
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const rows:RawRow[]=[];
    workbook.eachSheet(sheet=>{
      const headers:string[]=[];
      sheet.eachRow((excelRow,rowNumber)=>{
        const values=(excelRow.values as ExcelJS.CellValue[]).slice(1).map(value=>clean(typeof value==="object"&&value!==null&&"text" in value?value.text:value));
        if(rowNumber===1){headers.push(...values);return}
        if(values.some(Boolean)) rows.push(Object.fromEntries(values.map((value,index)=>[headers[index]||`coluna_${index+1}`,value])));
      });
    });
    return rows;
  }
  if(extension==="pdf"){
    const parsed=await pdf(buffer);
    const lines=parsed.text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const rows:RawRow[]=[];
    for(let index=0;index<lines.length;index++){
      const line=lines[index];
      const foundPhone=line.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/)?.[0]||"";
      const foundEmail=line.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]||"";
      if(foundPhone||foundEmail){
        const before=lines[index-1]||"";
        rows.push({Nome:before,Telefone:foundPhone,"E-mail":foundEmail,Linha:line});
      }
    }
    return rows;
  }
  throw new Error("Formato não aceito. Use PDF, XLSX, CSV ou TXT.");
}

function normalizeRows(rows:RawRow[], fallbackProject:string, fallbackBuilder:string): ContactRow[] {
  return rows.map((raw,index)=>({
    name:pick(raw,["nome","cliente","nomedocliente","lead"])||`Contato importado ${index+1}`,
    phone:phone(pick(raw,["telefone","celular","whatsapp","fone","contato","telefonewhatsapp"])),
    email:email(pick(raw,["email","e-mail","correioeletronico"])),
    project:pick(raw,["empreendimento","produto","interesse","imovel","projeto"])||fallbackProject,
    builder:pick(raw,["construtora","incorporadora","parceiro"])||fallbackBuilder,
    raw,
  })).filter(row=>row.phone.length>=10||row.email.includes("@"));
}

export async function POST(request:Request){
  try{
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File)) return NextResponse.json({error:"Selecione um arquivo."},{status:400});
    if(file.size>4_000_000) return NextResponse.json({error:"Arquivo acima de 4 MB. Divida a base em partes menores."},{status:413});
    const baseName=clean(form.get("baseName"))||file.name;
    const originType=clean(form.get("originType"))||"Lista fria";
    const fallbackBuilder=clean(form.get("builder"));
    const fallbackProject=clean(form.get("project"));
    const mixedProjects=clean(form.get("mixedProjects"))==="true";
    const rawRows=await parseFile(file);
    const normalized=normalizeRows(rawRows,fallbackProject,fallbackBuilder);
    const invalid=rawRows.length-normalized.length;
    const supabase=supabaseAdmin();
    const [{data:clients,error:clientsError},{data:sources,error:sourcesError}]=await Promise.all([
      supabase.from("clients").select("id,name,phone,email,project_interest"),
      supabase.from("client_sources").select("client_id,origin_type,origin_detail,project_interest,source_file"),
    ]);
    if(clientsError||sourcesError) throw clientsError||sourcesError;
    const byPhone=new Map((clients||[]).map(item=>[phone(item.phone||""),item]));
    const byEmail=new Map((clients||[]).filter(item=>item.email).map(item=>[email(item.email),item]));
    const pending=new Map<string,ContactRow>();
    for(const row of normalized){
      if(byPhone.get(row.phone)||byEmail.get(row.email)) continue;
      const identity=row.phone||row.email;
      if(!pending.has(identity)) pending.set(identity,row);
    }
    const createdRows=[...pending.values()];
    for(let offset=0;offset<createdRows.length;offset+=400){
      const chunk=createdRows.slice(offset,offset+400);
      const {data,error}=await supabase.from("clients").insert(chunk.map((row,index)=>({name:row.name,phone:row.phone||`SEM-TELEFONE-${Date.now()}-${offset+index}`,email:row.email||null,origin_type:originType,origin_detail:baseName,project_interest:row.project||null,data_quality:"validado"}))).select("id,name,phone,email,project_interest");
      if(error) throw error;
      for(const item of data||[]){byPhone.set(phone(item.phone||""),item);if(item.email)byEmail.set(email(item.email),item)}
    }
    const knownSources=new Set((sources||[]).map(item=>[item.client_id,item.origin_type,item.origin_detail||"",item.project_interest||"",item.source_file||""].join("|")));
    const sourceInserts:Record<string,unknown>[]=[]; const eventInserts:Record<string,unknown>[]=[];
    let duplicates=0; let newInterests=0;
    for(const row of normalized){
      const client=byPhone.get(row.phone)||byEmail.get(row.email);
      if(!client) continue;
      const signature=[client.id,originType,baseName,row.project||"",baseName].join("|");
      const existedBefore=(clients||[]).some(item=>item.id===client.id);
      if(existedBefore) duplicates++;
      if(!knownSources.has(signature)){
        sourceInserts.push({client_id:client.id,origin_type:originType,origin_detail:baseName,project_interest:row.project||null,source_file:baseName,source_row:JSON.stringify(row.raw)});
        knownSources.add(signature);
        if(existedBefore){
          newInterests++;
          eventInserts.push({client_id:client.id,event_type:"IMPORT_SOURCE_ADDED",title:"Novo interesse identificado em outra base",description:`Cliente localizado na base ${baseName}${row.builder?` da construtora ${row.builder}`:""}${row.project?` com interesse em ${row.project}`:""}. O cadastro único foi preservado, sem duplicação.`,metric_key:"additional_source"});
        }
      }
    }
    for(let offset=0;offset<sourceInserts.length;offset+=500){const {error}=await supabase.from("client_sources").upsert(sourceInserts.slice(offset,offset+500),{onConflict:"client_id,origin_type,origin_detail,project_interest,source_file",ignoreDuplicates:true});if(error)throw error}
    for(let offset=0;offset<eventInserts.length;offset+=500){const {error}=await supabase.from("client_events").insert(eventInserts.slice(offset,offset+500));if(error)throw error}
    const {error:importError}=await supabase.from("lead_imports").insert({file_name:baseName,origin_type:originType,origin_detail:[fallbackBuilder,mixedProjects?"Empreendimentos mistos":fallbackProject].filter(Boolean).join(" · ")||null,total_rows:rawRows.length,valid_rows:normalized.length,duplicate_rows:duplicates,invalid_rows:invalid});
    if(importError) throw importError;
    return NextResponse.json({ok:true,total:rawRows.length,valid:normalized.length,created:createdRows.length,duplicates,invalid,newInterests});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao importar base."},{status:500})}
}
