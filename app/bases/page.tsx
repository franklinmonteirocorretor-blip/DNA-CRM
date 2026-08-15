"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import "./bases.css";
import "./manual-entry.css";
import "./product-distribution.css";
import "./production-fixes.css";

type ImportRow = { id:number; file_name:string; origin_type:string; origin_detail:string|null; total_rows:number; valid_rows:number; duplicate_rows:number; invalid_rows:number; created_at:string };
type ProjectRow = { id:number; name:string; builders:{id:number;name:string;active:boolean}|Array<{id:number;name:string;active:boolean}> };
export default function BasesPage() {
  const [stats,setStats]=useState({total:0,leads:0,cold:0,quality:0,available:0});
  const [imports,setImports]=useState<ImportRow[]>([]);
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [base,setBase]=useState("all");
  const [builder,setBuilder]=useState("all");
  const [project,setProject]=useState("all");
  const [origin,setOrigin]=useState("all");
  const [broker,setBroker]=useState("Franklin Monteiro");
  const [quantity,setQuantity]=useState(50);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [manualOpen,setManualOpen]=useState(false);
  const [manualBuilder,setManualBuilder]=useState("all");
  const [importOpen,setImportOpen]=useState(false);
  const [importFile,setImportFile]=useState<File|null>(null);
  const [importForm,setImportForm]=useState({baseName:"",originType:"Lista fria",builder:"all",project:"all"});
  const [manual,setManual]=useState({name:"",phone:"",email:"",originType:"Indicação",originDetail:"",projectInterest:"",note:""});

  const load=async()=>{
    const [summaryResponse,basesResponse]=await Promise.all([fetch("/api/base-summary"),fetch("/api/bases")]);
    if(summaryResponse.ok){const data=await summaryResponse.json();setStats(data)}
    if(basesResponse.ok){const data=await basesResponse.json();setImports(data.imports||[]);setProjects(data.projects||[])}
  };
  useEffect(()=>{
    const timer=window.setTimeout(()=>{load().catch(()=>setMessage("Falha ao carregar dados reais da Central de Bases."))},0);
    return()=>window.clearTimeout(timer);
  },[]);

  const builders=useMemo(()=>[...new Set(projects.map(item=>Array.isArray(item.builders)?item.builders[0]?.name:item.builders?.name).filter(Boolean))] as string[],[projects]);
  const projectOptions=useMemo(()=>projects.filter(item=>builder==="all"||(Array.isArray(item.builders)?item.builders[0]?.name:item.builders?.name)===builder),[projects,builder]);
  const importProjectOptions=useMemo(()=>projects.filter(item=>importForm.builder==="all"||(Array.isArray(item.builders)?item.builders[0]?.name:item.builders?.name)===importForm.builder),[projects,importForm.builder]);
  const manualProjectOptions=useMemo(()=>projects.filter(item=>manualBuilder==="all"||(Array.isArray(item.builders)?item.builders[0]?.name:item.builders?.name)===manualBuilder),[projects,manualBuilder]);

  const operation=async(action:"export"|"distribute")=>{
    setBusy(true);setMessage("");
    const response=await fetch("/api/bases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,base,builder,project,origin,broker,quantity})});
    if(action==="export"&&response.ok){const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`base-personalizada-${Date.now()}.csv`;link.click();URL.revokeObjectURL(url);setMessage("Base personalizada exportada.");setBusy(false);return}
    const data=await response.json().catch(()=>({}));setMessage(response.ok?`${data.assigned} contatos enviados para ${data.broker} em ${data.assignedDate}.`:data.error||"Operação não concluída.");setBusy(false);
  };

  const saveManual=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setMessage("");
    const response=await fetch("/api/clients",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(manual)});const data=await response.json().catch(()=>({}));
    setMessage(response.ok?(data.created?"Contato cadastrado e D0 criado.":"Contato já existia. Nova origem registrada no histórico."):data.error||"Falha ao cadastrar contato.");
    if(response.ok){setManual({name:"",phone:"",email:"",originType:"Indicação",originDetail:"",projectInterest:"",note:""});setManualBuilder("all");setManualOpen(false);await load()};setBusy(false);
  };

  const importBase=async(event:FormEvent)=>{
    event.preventDefault();
    if(!importFile){setMessage("Selecione o arquivo da base.");return}
    setBusy(true);setMessage("Lendo, validando e eliminando duplicidades...");
    const data=new FormData();data.set("file",importFile);data.set("baseName",importForm.baseName||importFile.name);data.set("originType",importForm.originType);data.set("builder",importForm.builder==="all"?"":importForm.builder);data.set("project",["all","__mixed__"].includes(importForm.project)?"":importForm.project);data.set("mixedProjects",String(importForm.project==="__mixed__"));
    const response=await fetch("/api/bases/import",{method:"POST",body:data});const result=await response.json().catch(()=>({}));
    if(response.ok){setMessage(`Base importada: ${result.created} novos, ${result.duplicates} já existentes, ${result.newInterests} novos interesses adicionados ao histórico e ${result.invalid} inválidos.`);setImportFile(null);setImportForm({baseName:"",originType:"Lista fria",builder:"all",project:"all"});setImportOpen(false);await load()}else setMessage(result.error||"Falha ao importar base.");
    setBusy(false);
  };

  return <main className="base-shell">
    <aside className="base-sidebar"><div className="base-brand"><Image src="/monteiro-logo.png" alt="Monteiro CRM" width={58} height={64}/><b>MONTEIRO</b><span>CRM</span></div><CrmNavigation/><div className="base-user"><i>FM</i><div><b>Franklin Monteiro</b><span>Corretor + Gestor</span></div></div></aside>
    <section className="base-main">
      <header className="base-header"><div><span>Entrada e governança de contatos</span><h1>Central de Bases</h1><p>Dados reais, origem preservada, distribuição controlada.</p></div><div className="base-actions"><button onClick={()=>setImportOpen(value=>!value)}>＋ Importar base</button><button onClick={()=>setManualOpen(value=>!value)}>＋ Cadastrar contato</button></div></header>
      <div className="base-content">
        {message&&<div className="base-message">{message}</div>}
        {importOpen&&<form className="base-import" onSubmit={importBase}><header><div><span>Importação inteligente</span><h2>Carregar nova base de contatos</h2><p>PDF, XLSX, CSV ou TXT. O CRM preserva um único cliente e registra cada novo interesse no histórico.</p></div><button type="button" onClick={()=>setImportOpen(false)}>×</button></header><div className="import-grid"><label className="file-field"><span>Arquivo</span><input required type="file" accept=".pdf,.xlsx,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={event=>{const file=event.target.files?.[0]||null;setImportFile(file);if(file&&!importForm.baseName)setImportForm(current=>({...current,baseName:file.name.replace(/\.[^.]+$/,"" )}))}}/><b>{importFile?.name||"Selecionar PDF, Excel ou CSV"}</b></label><label><span>Nome da base</span><input required value={importForm.baseName} onChange={e=>setImportForm({...importForm,baseName:e.target.value})} placeholder="Ex.: Lista Canopus agosto"/></label><label><span>Tipo da base</span><select value={importForm.originType} onChange={e=>setImportForm({...importForm,originType:e.target.value})}><option>Lista fria</option><option>Lead</option><option>Indicação</option><option>Resgate</option></select></label><label><span>Construtora padrão</span><select value={importForm.builder} onChange={e=>setImportForm({...importForm,builder:e.target.value,project:"all"})}><option value="all">Identificar pelo arquivo / não informar</option>{builders.map(name=><option key={name}>{name}</option>)}</select></label><label><span>Empreendimento padrão</span><select disabled={importForm.builder==="all"} value={importForm.project} onChange={e=>setImportForm({...importForm,project:e.target.value})}><option value="all">{importForm.builder==="all"?"Escolha a construtora primeiro":"Identificar pelo arquivo"}</option>{importForm.builder!=="all"&&<option value="__mixed__">Empreendimentos mistos</option>}{importProjectOptions.map(item=><option key={item.id}>{item.name}</option>)}</select><small>{importForm.project==="__mixed__"?"Cada contato receberá o empreendimento informado na própria linha da base.":"Use um empreendimento único ou deixe o CRM ler o arquivo."}</small></label></div><div className="dedupe-rule"><b>Regra de duplicidade</b><span>Telefone ou e-mail já existente não cria outro cliente. A nova base, construtora e empreendimento entram como origem adicional e observação na ficha única.</span></div><footer><small>Limite por arquivo: 4 MB</small><button disabled={busy||!importFile}>{busy?"Processando base...":"Importar e validar contatos"}</button></footer></form>}
        <section className="base-kpis"><article><span>Base total</span><strong>{stats.total.toLocaleString("pt-BR")}</strong><small>Contatos únicos</small></article><article><span>Leads</span><strong>{stats.leads.toLocaleString("pt-BR")}</strong><small>Origem Lead</small></article><article><span>Listas frias</span><strong>{stats.cold.toLocaleString("pt-BR")}</strong><small>Origem Lista fria</small></article><article className="warning"><span>Dados para corrigir</span><strong>{stats.quality.toLocaleString("pt-BR")}</strong><small>Qualidade não validada</small></article><article className="success"><span>Disponíveis</span><strong>{stats.available.toLocaleString("pt-BR")}</strong><small>Ainda não trabalhados</small></article></section>

        {manualOpen&&<form className="manual-contact" onSubmit={saveManual}><header><div><span>Entrada individual</span><h2>Cadastrar contato real</h2></div><button type="button" onClick={()=>setManualOpen(false)}>×</button></header><div className="manual-grid"><label><span>Nome</span><input required value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})}/></label><label><span>Telefone / WhatsApp</span><input required value={manual.phone} onChange={e=>setManual({...manual,phone:e.target.value})}/></label><label><span>E-mail</span><input type="email" value={manual.email} onChange={e=>setManual({...manual,email:e.target.value})}/></label><label><span>Origem</span><select value={manual.originType} onChange={e=>setManual({...manual,originType:e.target.value})}><option>Indicação</option><option>Carteira própria</option><option>Cliente espontâneo</option><option>Evento / plantão</option></select></label><label><span>Origem detalhada</span><input value={manual.originDetail} onChange={e=>setManual({...manual,originDetail:e.target.value})}/></label><label><span>Construtora</span><select value={manualBuilder} onChange={e=>{setManualBuilder(e.target.value);setManual({...manual,projectInterest:""})}}><option value="all">Não informada</option>{builders.map(name=><option key={name}>{name}</option>)}</select></label><label><span>Empreendimento da construtora</span><select disabled={manualBuilder==="all"} value={manual.projectInterest} onChange={e=>setManual({...manual,projectInterest:e.target.value})}><option value="">{manualBuilder==="all"?"Selecione a construtora primeiro":"Não informado"}</option>{manualProjectOptions.map(item=><option key={item.id}>{item.name}</option>)}</select></label><label className="wide"><span>Observação</span><textarea value={manual.note} onChange={e=>setManual({...manual,note:e.target.value})}/></label></div><footer><span></span><button disabled={busy}>Salvar contato</button></footer></form>}

        <section className="distribution-command"><header><div><span>Distribuição e exportação</span><h2>Personalizar base por origem, construtora e empreendimento</h2></div><small>Nenhum contato repetido</small></header><div className="distribution-fields"><label><span>Base cadastrada</span><select value={base} onChange={e=>setBase(e.target.value)}><option value="all">Todas as bases</option>{imports.map(item=><option value={item.file_name} key={item.id}>{item.file_name}</option>)}</select></label><label><span>Tipo</span><select value={origin} onChange={e=>setOrigin(e.target.value)}><option value="all">Todos</option><option>Lead</option><option>Lista fria</option><option>Indicação</option><option>Resgate</option></select></label><label><span>Corretor</span><select value={broker} onChange={e=>setBroker(e.target.value)}><option>Franklin Monteiro</option></select><small>Novos corretores entram quando usuários forem cadastrados.</small></label><label><span>Construtora</span><select value={builder} onChange={e=>{setBuilder(e.target.value);setProject("all")}}><option value="all">Selecione a construtora</option>{builders.map(name=><option key={name}>{name}</option>)}</select></label><label><span>Empreendimento da construtora</span><select value={project} disabled={builder==="all"} onChange={e=>setProject(e.target.value)}><option value="all">{builder==="all"?"Selecione a construtora primeiro":"Todos os empreendimentos"}</option>{projectOptions.map(item=><option key={item.id}>{item.name}</option>)}</select><small>{builder==="all"?"Escolha a construtora para carregar seus empreendimentos.":`${projectOptions.length} empreendimento(s) cadastrado(s) em ${builder}.`}</small></label><label><span>Quantidade</span><input type="number" min={1} max={50} value={quantity} onChange={e=>setQuantity(Math.min(50,Math.max(1,Number(e.target.value))))}/></label></div><footer><div><span>Recorte selecionado</span><b>{base==="all"?"Todas as bases":base} · {builder==="all"?"Construtora não selecionada":builder} · {project==="all"?"Todos os empreendimentos":project}</b></div><div className="distribution-buttons"><button className="secondary" disabled={busy} onClick={()=>operation("export")}>Exportar CSV</button><button disabled={busy} onClick={()=>operation("distribute")}>Enviar {quantity} para {broker}</button></div></footer></section>

        <section className="import-history"><header><div><span>Bases cadastradas</span><h2>Histórico real de importações</h2></div><button disabled={busy} onClick={()=>operation("export")}>Exportar recorte atual</button></header><div className="history-header"><span>Arquivo</span><span>Tipo</span><span>Total</span><span>Válidos</span><span>Duplicados</span><span>Inválidos</span><span>Importada em</span></div>{imports.length?imports.map(item=><article key={item.id}><div><b>{item.file_name}</b><span>{item.origin_detail||"Origem não informada"}</span></div><strong>{item.origin_type}</strong><span>{item.total_rows}</span><span>{item.valid_rows}</span><span>{item.duplicate_rows}</span><span>{item.invalid_rows}</span><span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span></article>):<div className="empty-state">Nenhuma importação registrada.</div>}</section>

      </div>
    </section>
  </main>;
}
