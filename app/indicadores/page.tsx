"use client";
import Image from "next/image";
import Link from "next/link";
import { CrmNavigation } from "../components/crm-navigation";
import { useEffect, useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import "./indicadores.css";
import "./funnel-premium.css";
import "./funnel-layout-fix.css";

const periods = ["Hoje", "Semana", "Mês", "Trimestre", "Ano"];
type Metrics = {
  eventCounts: Record<string, number>;
  appointmentCounts: Record<string, number>;
  sales: { sales: number; vgv: number; commission: number };
  stages: Array<{ stage: string; total: number }>;
};
const emptyMetrics: Metrics = {
  eventCounts: {},
  appointmentCounts: {},
  sales: { sales: 0, vgv: 0, commission: 0 },
  stages: [],
};

export default function Indicadores() {
  const [period, setPeriod] = useState("Mês");
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((data) => setMetrics({ ...emptyMetrics, ...data }))
      .catch(() => {});
  }, [period]);
  const stageCount = (name: string) =>
    metrics.stages.find((item) => item.stage === name)?.total || 0;
  const attempts = metrics.eventCounts.contact_attempt || 0,
    effective = metrics.eventCounts.effective_contact || 0,
    qualified = metrics.eventCounts.qualified_conversation || 0,
    followups = metrics.eventCounts.follow_up || 0;
  const scheduled = Object.values(metrics.appointmentCounts).reduce(
      (a, b) => a + b,
      0,
    ),
    attended = metrics.appointmentCounts.Compareceu || 0;
  const folders = metrics.eventCounts.folder_sent || 0,
    approvals = stageCount("Aprovado") + stageCount("Aprovado sem fechamento"),
    proposals = metrics.eventCounts.proposal || 0,
    sales = metrics.sales.sales || 0;
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const kpis = useMemo(
    () => [
      [
        "Tentativas de contato",
        String(attempts),
        "1.100",
        attempts ? `${((attempts / 1100) * 100).toFixed(1)}%` : "0%",
        "neutral",
      ],
      [
        "Contatos efetivos",
        String(effective),
        "—",
        attempts
          ? `${((effective / attempts) * 100).toFixed(1)}% das tentativas`
          : "0%",
        "neutral",
      ],
      [
        "Conversas qualificadas",
        String(qualified),
        "220–330",
        qualified ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Novos follow-ups",
        String(followups),
        "110–220",
        followups ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Agendamentos",
        String(scheduled),
        "44",
        scheduled ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Comparecimentos",
        String(attended),
        "30",
        attended ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Pastas enviadas",
        String(folders),
        "22",
        folders ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Aprovações",
        String(approvals),
        "10",
        approvals ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Propostas",
        String(proposals),
        "10",
        proposals ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "Vendas",
        String(sales),
        "5 / 7 / 10 / 12",
        sales ? "Em produção" : "0%",
        "neutral",
      ],
      [
        "VGV confirmado",
        brl.format(metrics.sales.vgv),
        "—",
        sales ? "Produção real" : "0%",
        "neutral",
      ],
      [
        "Comissão recebida",
        brl.format(metrics.sales.commission),
        "—",
        sales ? "Produção real" : "0%",
        "neutral",
      ],
    ],
    [
      attempts,
      effective,
      qualified,
      followups,
      scheduled,
      attended,
      folders,
      approvals,
      proposals,
      sales,
      metrics.sales.vgv,
      metrics.sales.commission,
    ],
  );
  const funnel = useMemo(
    () =>
      [
        ["Tentativas", attempts, 100],
        [
          "Contatos efetivos",
          effective,
          attempts ? (effective / attempts) * 100 : 0,
        ],
        [
          "Qualificados",
          qualified,
          effective ? (qualified / effective) * 100 : 0,
        ],
        [
          "Análises",
          stageCount("Em análise"),
          qualified ? (stageCount("Em análise") / qualified) * 100 : 0,
        ],
        ["Aprovações", approvals, folders ? (approvals / folders) * 100 : 0],
        ["Visitas", attended, scheduled ? (attended / scheduled) * 100 : 0],
        ["Propostas", proposals, attended ? (proposals / attended) * 100 : 0],
        ["Vendas", sales, proposals ? (sales / proposals) * 100 : 0],
      ] as Array<[string, number, number]>,
    [
      attempts,
      effective,
      qualified,
      folders,
      approvals,
      scheduled,
      attended,
      proposals,
      sales,
      metrics.stages,
    ],
  );
  async function generatePdf() {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const gold = rgb(.86,.64,.18), white = rgb(.96,.96,.94), muted = rgb(.58,.58,.58), panel = rgb(.075,.075,.075), bg = rgb(.025,.025,.025);
    const addPage = (title:string, subtitle:string) => { const page=doc.addPage([842,595]); page.drawRectangle({x:0,y:0,width:842,height:595,color:bg}); page.drawRectangle({x:0,y:548,width:842,height:47,color:rgb(.06,.05,.025)}); page.drawText("MONTEIRO CRM",{x:38,y:568,size:16,font:bold,color:gold}); page.drawText(title,{x:38,y:522,size:23,font:bold,color:white}); page.drawText(subtitle,{x:38,y:502,size:9,font,color:muted}); page.drawText(`Relatório executivo · ${period} · ${new Date().toLocaleString("pt-BR")}`,{x:585,y:568,size:7,font,color:muted}); return page; };
    let page=addPage("Visão executiva", "Metas, produtividade e resultado financeiro em uma leitura.");
    kpis.slice(0,12).forEach((k,index)=>{const col=index%4,row=Math.floor(index/4),x=38+col*195,y=450-row*112;page.drawRectangle({x,y,width:180,height:88,color:panel,borderColor:rgb(.18,.16,.1),borderWidth:1});page.drawText(String(k[0]).toUpperCase(),{x:x+12,y:y+66,size:7,font:bold,color:muted});page.drawText(String(k[1]),{x:x+12,y:y+37,size:21,font:bold,color:white});page.drawText(`META ${k[2]}`,{x:x+12,y:y+15,size:7,font:bold,color:gold});});
    page.drawRectangle({x:38,y:70,width:766,height:46,color:rgb(.12,.09,.025),borderColor:gold,borderWidth:1});page.drawText(`${sales} vendas · ${brl.format(metrics.sales.vgv)} de VGV · ${brl.format(metrics.sales.commission)} recebidos`,{x:58,y:88,size:15,font:bold,color:gold});
    page=addPage("Funil comercial", "Conversão ponta a ponta e identificação visual de gargalos.");
    const widths=[700,620,545,470,395,320,245,170]; funnel.forEach(([label,value,rate],index)=>{const width=widths[index],x=(842-width)/2,y=445-index*49;page.drawRectangle({x,y,width,height:40,color:index===7?rgb(.25,.17,.035):rgb(.11,.09,.055),borderColor:gold,borderWidth:.7});page.drawText(`${String(index+1).padStart(2,"0")}  ${label.toUpperCase()}`,{x:x+18,y:y+16,size:10,font:bold,color:white});page.drawText(String(value),{x:x+width-82,y:y+14,size:15,font:bold,color:gold});page.drawText(`${Number(rate).toFixed(1)}%`,{x:x+width-38,y:y+16,size:7,font,color:muted});});
    page=addPage("Diagnóstico e plano de ação", "Leitura gerencial para decidir o que corrigir no próximo ciclo.");
    const diagnoses=[{title:"Volume de prospecção",value:attempts,goal:1100,action:"Executar carteira somente em dias úteis e registrar 100% das tentativas."},{title:"Qualificação",value:qualified,goal:220,action:"Aumentar contatos efetivos e manter próxima ação obrigatória."},{title:"Pastas para análise",value:folders,goal:22,action:"Cobrar documentos e reduzir abandono antes do envio ao CCA."},{title:"Aprovações",value:approvals,goal:10,action:"Acompanhar SLA do CCA e trabalhar restrições e condicionados."},{title:"Vendas",value:sales,goal:5,action:"Levar aprovados à Mesa de Fechamento e registrar o desfecho."}];diagnoses.forEach((item,index)=>{const y=438-index*78,rate=Math.min(1,item.value/item.goal);page.drawText(item.title,{x:46,y:y+32,size:12,font:bold,color:white});page.drawText(`${item.value} / ${item.goal}`,{x:705,y:y+32,size:12,font:bold,color:gold});page.drawRectangle({x:46,y:y+14,width:700,height:7,color:rgb(.16,.16,.16)});page.drawRectangle({x:46,y:y+14,width:700*rate,height:7,color:gold});page.drawText(item.action,{x:46,y:y-3,size:8,font,color:muted});});page.drawRectangle({x:46,y:52,width:750,height:48,color:rgb(.1,.08,.025),borderColor:gold,borderWidth:1});page.drawText("REGRA DE GESTÃO: números só aumentam por registros reais do CRM.",{x:63,y:72,size:11,font:bold,color:gold});
    const bytes = await doc.save();
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monteiro-crm-indicadores-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="ind-shell">
      <aside className="ind-sidebar">
        <div className="ind-brand">
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro CRM"
            width={62}
            height={70}
          />
          <b>MONTEIRO</b>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="ind-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="ind-main">
        <header className="ind-header">
          <div>
            <span>Inteligência comercial e gestão</span>
            <h1>Central de Indicadores</h1>
            <p>
              Produtividade, conversão, receita e gargalos em um único comando.
            </p>
          </div>
          <div className="export-actions">
            <button onClick={generatePdf}>Apresentação / PDF</button>
            <a href="/api/metrics/export?format=csv">Exportar BI · CSV</a>
            <a href="/api/metrics/export?format=json">JSON</a>
            <button className="gold">Definir metas</button>
          </div>
        </header>
        <div className="ind-content">
          <section className="ind-filters">
            <div>
              {periods.map((p) => (
                <button
                  key={p}
                  className={period === p ? "active" : ""}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <label>
              Origem
              <select>
                <option>Todas as origens</option>
                <option>Leads</option>
                <option>Listas frias</option>
                <option>Indicações</option>
              </select>
            </label>
            <label>
              Construtora
              <select>
                <option>Todas</option>
              </select>
            </label>
            <label>
              Empreendimento
              <select>
                <option>Todos</option>
              </select>
            </label>
          </section>
          <section className="goal-strip">
            <div>
              <span>Resultado do período</span>
              <strong>{sales} vendas</strong>
              <small>Produção real do período selecionado</small>
            </div>
            {[
              [5, "Meta base"],
              [7, "Meta forte"],
              [10, "Alta performance"],
              [12, "Excelência"],
            ].map(([goal, label]) => (
              <article key={goal}>
                <b>{goal}</b>
                <span>{label}</span>
                <i>
                  <em
                    style={{
                      width: `${Math.min(100, (sales / Number(goal)) * 100)}%`,
                    }}
                  />
                </i>
                <small>faltam {Math.max(0, Number(goal) - sales)}</small>
              </article>
            ))}
          </section>
          <section className="kpi-grid">
            {kpis.map((k) => (
              <article className={k[4]} key={k[0]}>
                <span>{k[0]}</span>
                <strong>{k[1]}</strong>
                <div>
                  <small>Meta: {k[2]}</small>
                  <b>{k[3]}</b>
                </div>
              </article>
            ))}
          </section>
          <div className="ind-two">
            <section className="ind-panel funnel-panel">
              <header>
                <div>
                  <span>Conversão ponta a ponta</span>
                  <h2>Funil comercial do período</h2>
                </div>
                <small>Somente interações registradas</small>
              </header>
              <div>
                {funnel.map((f, i) => (
                  <article key={f[0]}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <b>{f[0]}</b>
                      <small>
                        {i === 0
                          ? "Base total do período"
                          : `${f[2]}% de conversão`}
                      </small>
                      <i>
                        <em
                          style={{ width: `${Math.max(4, Number(f[2]))}%` }}
                        />
                      </i>
                    </div>
                    <strong>{f[1]}</strong>
                  </article>
                ))}
              </div>
            </section>
            <section className="ind-panel diagnosis">
              <header>
                <div>
                  <span>Diagnóstico automático</span>
                  <h2>Gargalos e ação recomendada</h2>
                </div>
              </header>
              <article className="critical">
                <i>01</i>
                <div>
                  <b>Aprovação → proposta abaixo do necessário</b>
                  <p>{approvals} clientes aprovados aguardam avanço real.</p>
                  <Link href="/analises">Abrir clientes</Link>
                </div>
              </article>
              <article>
                <i>02</i>
                <div>
                  <b>Follow-ups abaixo da cadência projetada</b>
                  <p>{followups} follow-ups registrados no período.</p>
                  <Link href="/follow-ups">Executar fila</Link>
                </div>
              </article>
              <article className="positive">
                <i>03</i>
                <div>
                  <b>Comparecimento supera a meta</b>
                  <p>{attended} comparecimentos registrados.</p>
                  <Link href="/agenda">Ver agenda</Link>
                </div>
              </article>
              <footer>
                <span>Projeção no ritmo atual</span>
                <strong>
                  {sales} vendas · {brl.format(metrics.sales.vgv)} de VGV
                </strong>
              </footer>
            </section>
          </div>
          <section className="ind-panel source-panel">
            <header>
              <div>
                <span>Atribuição e retorno</span>
                <h2>Desempenho por origem do contato</h2>
              </div>
              <small>Leads não se confundem com tentativas.</small>
            </header>
            <div className="source-table">
              <div className="tr head">
                <span>Origem</span>
                <span>Contatos</span>
                <span>Qualificados</span>
                <span>Pastas</span>
                <span>Vendas</span>
                <span>Investimento</span>
                <span>VGV</span>
              </div>
              <div className="tr">
                <span>Sem produção registrada</span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
                <span>R$ 0,00</span>
                <span>R$ 0,00</span>
              </div>
            </div>
          </section>
          <section className="integrity">
            <div>
              <span>Integridade operacional</span>
              <b>{attempts} interações operacionais</b>
            </div>
            <div>
              <span>Clientes sem próxima ação</span>
              <b className="danger">0</b>
            </div>
            <div>
              <span>Leads quentes sem acompanhamento</span>
              <b className="good-text">0</b>
            </div>
            <div>
              <span>Última atualização</span>
              <b>Agora</b>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
