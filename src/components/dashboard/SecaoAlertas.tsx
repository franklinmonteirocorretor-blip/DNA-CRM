import Link from 'next/link'

// ── Tipos das props ──────────────────────────────────────────────────────────
// Cada tipo reflete exatamente o que a query do dashboard já busca.
// Usamos Pick/intersection para não depender de importar interfaces inteiras.

type ClienteParado = {
  id: string
  nome: string
  etapa_atual: string
  ultima_atividade_em: string
}

type AgendamentoProximo = {
  id: string
  cliente_id: string
  data_hora: string
  empreendimento_interesse: string | null
  clientes: { nome: string }
}

type DocPendente = {
  id: string
  cliente_id: string
  tipo: string
  status_validacao: string
}

type PosVendaAlerta = {
  id: string
  nome: string
  proxima_acao: string | null
  proxima_acao_em: string | null
}

interface SecaoAlertasProps {
  clientesParados: ClienteParado[]
  agendamentosProximos: AgendamentoProximo[]
  docsPendentes: DocPendente[]
  posVendaAlertas: PosVendaAlerta[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatarDiasSemContato(dataISO: string): string {
  const diff = Date.now() - new Date(dataISO).getTime()
  const dias = Math.floor(diff / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

function formatarDataHora(dataISO: string): string {
  const d = new Date(dataISO)
  const hoje = new Date()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)

  const diaStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${horaStr}`
  if (d.toDateString() === amanha.toDateString()) return `Amanhã, ${horaStr}`
  return `${diaStr} às ${horaStr}`
}

function formatarPrazo(dataISO: string): string {
  const diff = new Date(dataISO).getTime() - Date.now()
  const dias = Math.ceil(diff / 86400000)
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? 's' : ''}`
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  return `Vence em ${dias} dias`
}

function labelEtapa(etapa: string): string {
  const labels: Record<string, string> = {
    NOVO_LEAD: 'Novo Lead',
    CONTATOS: 'Contatos',
    AGENDAMENTO: 'Agendamento',
    COMPARECIMENTO: 'Comparecimento',
    ANALISE: 'Análise',
    RESTRICOES: 'Restrições',
    CONDICIONADOS: 'Condicionados',
    APROVADOS: 'Aprovados',
    FECHAMENTOS: 'Fechamentos',
    POS_VENDA: 'Pós-Venda',
  }
  return labels[etapa] ?? etapa
}

function labelTipoDocumento(tipo: string): string {
  const labels: Record<string, string> = {
    RG: 'RG',
    CPF: 'CPF',
    CNH: 'CNH',
    COMPROVANTE_RENDA: 'Comprovante de Renda',
    FGTS: 'FGTS',
    CONTRATO: 'Contrato',
    PROPOSTA_PDF: 'Proposta',
    OUTRO: 'Documento',
  }
  return labels[tipo] ?? tipo
}

// ── Componentes auxiliares ───────────────────────────────────────────────────

function Badge({ children, cor }: { children: React.ReactNode; cor: 'vermelho' | 'amarelo' | 'azul' | 'roxo' }) {
  const cores = {
    vermelho: 'bg-red-100 text-red-700 border-red-200',
    amarelo: 'bg-amber-100 text-amber-700 border-amber-200',
    azul: 'bg-blue-100 text-blue-700 border-blue-200',
    roxo: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cores[cor]}`}>
      {children}
    </span>
  )
}

function TituloSecao({ icone, texto, cor, count }: { icone: string; texto: string; cor: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icone}</span>
      <h3 className={`text-sm font-semibold ${cor}`}>{texto}</h3>
      {count > 0 && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
          {count}
        </span>
      )}
    </div>
  )
}

// ── Componente Principal ─────────────────────────────────────────────────────

export default function SecaoAlertas({
  clientesParados,
  agendamentosProximos,
  docsPendentes,
  posVendaAlertas,
}: SecaoAlertasProps) {
  const temAlgumAlerta =
    clientesParados.length > 0 ||
    agendamentosProximos.length > 0 ||
    docsPendentes.length > 0 ||
    posVendaAlertas.length > 0

  return (
    <div className="space-y-4">
      {/* ── 1. CLIENTES SEM CONTATO (URGENTE) ────────────────────────────── */}
      {clientesParados.length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 shadow-sm">
          <TituloSecao
            icone="🚨"
            texto="Clientes sem contato"
            cor="text-red-800"
            count={clientesParados.length}
          />
          <p className="mt-1 text-xs text-red-600">
            Estes clientes estão parados há 5+ dias sem nenhuma atividade registrada.
          </p>
          <ul className="mt-3 space-y-2">
            {clientesParados.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/clientes/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-2.5 transition hover:bg-red-100"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{c.nome}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {labelEtapa(c.etapa_atual)}
                    </span>
                  </div>
                  <Badge cor="vermelho">
                    {formatarDiasSemContato(c.ultima_atividade_em)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/clientes"
            className="mt-3 inline-block text-xs font-medium text-red-700 underline hover:text-red-900"
          >
            Ver todos os clientes →
          </Link>
        </div>
      )}

      {/* ── 2. AGENDAMENTOS HOJE / AMANHÃ ────────────────────────────────── */}
      {agendamentosProximos.length > 0 && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
          <TituloSecao
            icone="📅"
            texto="Agendamentos próximos"
            cor="text-blue-800"
            count={agendamentosProximos.length}
          />
          <p className="mt-1 text-xs text-blue-600">
            Compromissos para hoje e amanhã.
          </p>
          <ul className="mt-3 space-y-2">
            {agendamentosProximos.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/clientes/${a.cliente_id}`}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-4 py-2.5 transition hover:bg-blue-100"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {a.clientes.nome}
                    </span>
                    {a.empreendimento_interesse && (
                      <span className="ml-2 text-xs text-gray-500">
                        — {a.empreendimento_interesse}
                      </span>
                    )}
                  </div>
                  <Badge cor="azul">{formatarDataHora(a.data_hora)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 3. DOCUMENTOS PENDENTES ──────────────────────────────────────── */}
      {docsPendentes.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <TituloSecao
            icone="📄"
            texto="Documentos pendentes de validação"
            cor="text-amber-800"
            count={docsPendentes.length}
          />
          <p className="mt-1 text-xs text-amber-600">
            Documentos enviados que aguardam validação.
          </p>
          <ul className="mt-3 space-y-2">
            {docsPendentes.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/clientes/${d.cliente_id}`}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-2.5 transition hover:bg-amber-100"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {labelTipoDocumento(d.tipo)}
                  </span>
                  <Badge cor="amarelo">Pendente</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 4. PÓS-VENDA COM PRAZO ──────────────────────────────────────── */}
      {posVendaAlertas.length > 0 && (
        <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 shadow-sm">
          <TituloSecao
            icone="🏠"
            texto="Pós-venda — prazos próximos"
            cor="text-purple-800"
            count={posVendaAlertas.length}
          />
          <p className="mt-1 text-xs text-purple-600">
            Próximas ações com prazo vencendo ou vencido.
          </p>
          <ul className="mt-3 space-y-2">
            {posVendaAlertas.map((pv) => (
              <li key={pv.id}>
                <Link
                  href={`/dashboard/clientes/${pv.id}`}
                  className="flex items-center justify-between rounded-lg border border-purple-200 bg-white px-4 py-2.5 transition hover:bg-purple-100"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{pv.nome}</span>
                    {pv.proxima_acao && (
                      <span className="ml-2 text-xs text-gray-500">
                        — {pv.proxima_acao}
                      </span>
                    )}
                  </div>
                  <Badge cor="roxo">
                    {pv.proxima_acao_em ? formatarPrazo(pv.proxima_acao_em) : 'Sem prazo'}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Estado vazio ─────────────────────────────────────────────────── */}
      {!temAlgumAlerta && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm">
          <span className="text-3xl">✅</span>
          <p className="mt-2 text-sm font-medium text-gray-600">
            Tudo em dia! Nenhum alerta no momento.
          </p>
        </div>
      )}
    </div>
  )
}
