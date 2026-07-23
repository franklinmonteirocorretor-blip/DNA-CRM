import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Agendamento, Documento, TipoDocumento } from '@/src/types'

// Labels dos tipos de documento
const DOC_LABEL: Record<TipoDocumento, string> = {
  RG: 'RG', CPF: 'CPF', CNH: 'CNH', COMPROVANTE_RENDA: 'Comprovante de Renda',
  COMPROVANTE_ENDERECO: 'Comprovante de Residência', FGTS: 'FGTS',
  CONTRATO: 'Contrato', PROPOSTA_PDF: 'Proposta', OUTRO: 'Outro',
  CERTIDAO_NASCIMENTO: 'Certidão de Nascimento', CERTIDAO_CASAMENTO: 'Certidão de Casamento',
  CERTIDAO_CASAMENTO_AVERBACAO: 'Cert. Casamento Averb.', MO_AUTODECLARACAO_DEPENDENTE: 'Autodecl. Dependente',
  HOLERITE: 'Holerite', CARTEIRA_TRABALHO: 'Carteira de Trabalho',
  EXTRATO_FGTS: 'Extrato FGTS', DECLARACAO_IR: 'Declaração IR',
}

type Alerta = {
  tipo: 'sem_contato' | 'agendamento' | 'doc_pendente' | 'pos_venda'
  cliente_id: string
  cliente_nome: string
  mensagem: string
  urgencia: 'alta' | 'media' | 'baixa'
  link: string
}

export default async function AlertasDashboard() {
  const supabase = await createSupabaseServerClient()
  const alertas: Alerta[] = []

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeISO = hoje.toISOString().slice(0, 10)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const amanhaISO = amanha.toISOString().slice(0, 10)
  const cincoDiasAtras = new Date(hoje)
  cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5)

  // 1. Clientes sem contato há ≥ 5 dias (etapas ativas)
  const { data: clientesParados } = await supabase
    .from('clientes')
    .select('id, nome, etapa_atual, ultima_atividade_em')
    .in('etapa_atual', ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO'])
    .lte('ultima_atividade_em', cincoDiasAtras.toISOString())
    .order('ultima_atividade_em', { ascending: true })
    .limit(10)

  for (const c of (clientesParados ?? [])) {
    const dias = Math.floor((hoje.getTime() - new Date(c.ultima_atividade_em).getTime()) / 86400000)
    alertas.push({
      tipo: 'sem_contato',
      cliente_id: c.id,
      cliente_nome: c.nome,
      mensagem: `Sem contato há ${dias} dias`,
      urgencia: dias >= 10 ? 'alta' : 'media',
      link: `/dashboard/clientes/${c.id}`,
    })
  }

  // 2. Agendamentos para hoje e amanhã
  const { data: agendamentosProximos } = await supabase
    .from('agendamentos')
    .select('id, cliente_id, data_hora, empreendimento_interesse, clientes!inner(nome)')
    .gte('data_hora', hojeISO)
    .lte('data_hora', `${amanhaISO}T23:59:59`)
    .eq('status', 'AGENDADO')
    .order('data_hora', { ascending: true })
    .limit(10)
    .returns<(Agendamento & { clientes: { nome: string } })[]>()

  for (const a of (agendamentosProximos ?? [])) {
    const data = new Date(a.data_hora)
    const quando = data.toISOString().slice(0, 10) === hojeISO ? 'Hoje' : 'Amanhã'
    alertas.push({
      tipo: 'agendamento',
      cliente_id: a.cliente_id,
      cliente_nome: a.clientes?.nome ?? 'Cliente',
      mensagem: `${quando} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${a.empreendimento_interesse ? ` — ${a.empreendimento_interesse}` : ''}`,
      urgencia: 'media',
      link: `/dashboard/clientes/${a.cliente_id}`,
    })
  }

  // 3. Documentos pendentes de validação
  const { data: docsPendentes } = await supabase
    .from('documentos')
    .select('id, cliente_id, tipo, created_at, clientes!inner(nome)')
    .eq('status_validacao', 'PENDENTE')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(10)
    .returns<(Documento & { clientes: { nome: string } })[]>()

  const docsAgrupados = new Map<string, { nome: string; docs: string[] }>()
  for (const d of (docsPendentes ?? [])) {
    const chave = d.cliente_id
    if (!docsAgrupados.has(chave)) {
      docsAgrupados.set(chave, { nome: d.clientes?.nome ?? 'Cliente', docs: [] })
    }
    docsAgrupados.get(chave)!.docs.push(DOC_LABEL[d.tipo] ?? d.tipo)
  }

  for (const [clienteId, info] of docsAgrupados) {
    alertas.push({
      tipo: 'doc_pendente',
      cliente_id: clienteId,
      cliente_nome: info.nome,
      mensagem: `Documentos pendentes: ${info.docs.join(', ')}`,
      urgencia: 'media',
      link: `/dashboard/clientes/${clienteId}`,
    })
  }

  // 4. Pós-venda com prazo vencido ou vencendo nos próximos 3 dias
  const tresDiasFrente = new Date(hoje)
  tresDiasFrente.setDate(tresDiasFrente.getDate() + 3)

  const { data: posVendaPrazos } = await supabase
    .from('clientes')
    .select('id, nome, proxima_acao, proxima_acao_em')
    .eq('etapa_atual', 'POS_VENDA')
    .not('proxima_acao_em', 'is', null)
    .lte('proxima_acao_em', tresDiasFrente.toISOString())
    .order('proxima_acao_em', { ascending: true })
    .limit(10)

  for (const c of (posVendaPrazos ?? [])) {
    const prazo = new Date(c.proxima_acao_em!)
    const vencido = prazo.getTime() < hoje.getTime()
    alertas.push({
      tipo: 'pos_venda',
      cliente_id: c.id,
      cliente_nome: c.nome,
      mensagem: vencido
        ? `Prazo VENCIDO: ${c.proxima_acao}`
        : `Prazo em ${prazo.toLocaleDateString('pt-BR')}: ${c.proxima_acao}`,
      urgencia: vencido ? 'alta' : 'media',
      link: `/dashboard/clientes/${c.id}`,
    })
  }

  // Se não há nenhum alerta
  if (alertas.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50/50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Lembretes e Alertas
        </h2>
        <p className="mt-2 text-sm text-green-600 font-medium">
          ✅ Tudo em dia! Nenhum alerta pendente.
        </p>
      </div>
    )
  }

  // Ordena alertas por urgência: alta > media > baixa
  const ordem = { alta: 0, media: 1, baixa: 2 }
  alertas.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia])

  const configAlerta = {
    sem_contato: { label: 'Sem contato', emoji: '⚠️', corBg: 'bg-red-50 border-red-200', corBadge: 'bg-red-100 text-red-700' },
    agendamento: { label: 'Agendamento', emoji: '📅', corBg: 'bg-blue-50 border-blue-200', corBadge: 'bg-blue-100 text-blue-700' },
    doc_pendente: { label: 'Documento', emoji: '📄', corBg: 'bg-amber-50 border-amber-200', corBadge: 'bg-amber-100 text-amber-700' },
    pos_venda: { label: 'Pós-Venda', emoji: '🏠', corBg: 'bg-indigo-50 border-indigo-200', corBadge: 'bg-indigo-100 text-indigo-700' },
  } as const

  const urgenteBg = 'border-red-300 ring-1 ring-red-200'

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Lembretes e Alertas
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
          {alertas.length}
        </span>
      </div>

      <div className="space-y-2">
        {alertas.map((alerta, i) => {
          const cfg = configAlerta[alerta.tipo]
          const urgente = alerta.urgencia === 'alta'
          return (
            <a
              key={`${alerta.tipo}-${alerta.cliente_id}-${i}`}
              href={alerta.link}
              className={`flex items-center gap-3 rounded-lg border p-3 transition hover:shadow-sm ${cfg.corBg} ${urgente ? urgenteBg : ''}`}
            >
              {/* Ícone + tipo */}
              <span className="shrink-0 text-base">{cfg.emoji}</span>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.corBadge}`}>
                    {cfg.label}
                  </span>
                  {urgente && (
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      URGENTE
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-gray-800 truncate">
                  {alerta.cliente_nome}: {alerta.mensagem}
                </p>
              </div>

              {/* Seta → */}
              <span className="shrink-0 text-xs text-gray-400">→</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}