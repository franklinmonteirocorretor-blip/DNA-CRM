import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import type { Cliente, Agendamento, Documento } from '@/src/types'
import Link from 'next/link'

// Calcula dias entre duas datas
function diasEntre(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

export default async function LembretesDashboard() {
  const supabase = await createSupabaseServerClient()

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const depoisDeAmanha = new Date(amanha)
  depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 1)

  // === 1. Clientes sem contato há ≥ 5 dias (nas etapas iniciais) ===
  const cincoDiasAtras = new Date(hoje)
  cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5)

  const { data: clientesParados } = await supabase
    .from('clientes')
    .select('id, nome, telefone, ultima_atividade_em, etapa_atual')
    .lt('ultima_atividade_em', cincoDiasAtras.toISOString())
    .in('etapa_atual', ['NOVO_LEAD', 'CONTATOS', 'AGENDAMENTO', 'COMPARECIMENTO'])
    .order('ultima_atividade_em', { ascending: true })
    .limit(10)
    .returns<
      Pick<Cliente, 'id' | 'nome' | 'telefone' | 'ultima_atividade_em' | 'etapa_atual'>[]
    >()

  // === 2. Agendamentos para hoje e amanhã ===
  const { data: agendamentosProximos } = await supabase
    .from('agendamentos')
    .select('id, cliente_id, data_hora, empreendimento_interesse, status, clientes(nome), comparecimentos(id)')
    .in('status', ['AGENDADO', 'CONFIRMADO'])
    .gte('data_hora', hoje.toISOString())
    .lt('data_hora', depoisDeAmanha.toISOString())
    .order('data_hora', { ascending: true })
    .limit(15)
    .returns<(Pick<Agendamento, 'id'|'cliente_id'|'data_hora'|'empreendimento_interesse'|'status'> & { clientes: { nome: string } | null; comparecimentos: { id: string }[] | null })[]>()

  // === 3. Documentos pendentes de validação ===
  const { data: documentosPendentes } = await supabase
    .from('documentos')
    .select('id, cliente_id, tipo, created_at, clientes(nome)')
    .eq('status_validacao', 'PENDENTE')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(10)
    .returns<(Pick<Documento, 'id'|'cliente_id'|'tipo'|'created_at'> & { clientes: { nome: string } | null })[]>()

  // === 4. Pós-venda com prazo vencido ou próximo (≤ 3 dias) ===
  const tresDiasFuturo = new Date(hoje)
  tresDiasFuturo.setDate(tresDiasFuturo.getDate() + 3)

  const { data: posVendaPrazos } = await supabase
    .from('clientes')
    .select('id, nome, proxima_acao, proxima_acao_em, etapa_atual')
    .eq('etapa_atual', 'POS_VENDA')
    .not('proxima_acao_em', 'is', null)
    .lte('proxima_acao_em', tresDiasFuturo.toISOString())
    .order('proxima_acao_em', { ascending: true })
    .limit(10)
    .returns<Pick<Cliente, 'id'|'nome'|'proxima_acao'|'proxima_acao_em'|'etapa_atual'>[]>()
    .limit(10)

  // Conta o total de alertas
  const totalAlertas =
    (clientesParados?.length ?? 0) +
    (agendamentosProximos?.length ?? 0) +
    (documentosPendentes?.length ?? 0) +
    (posVendaPrazos?.length ?? 0)

  // Se zero alertas, não renderiza nada
  if (totalAlertas === 0) {
    return (
      <div className="rounded-lg border border-green-100 bg-green-50 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-700">Tudo em dia!</p>
            <p className="mt-0.5 text-xs text-green-500">
              Nenhum alerta pendente no momento. Continue o bom trabalho.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Lembretes</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            {totalAlertas} alerta{totalAlertas !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Alertas em grid de 2 colunas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Alerta 1: Clientes sem contato (URGENTE - vermelho) */}
        {clientesParados && clientesParados.length > 0 && (
          <AlertaBloco
            titulo="Sem contato"
            icone="⚠️"
            cor="red"
            subtitulo={`${clientesParados.length} cliente${clientesParados.length !== 1 ? 's' : ''} parado${clientesParados.length !== 1 ? 's' : ''}`}
          >
            {clientesParados.map((c) => {
              const dias = diasEntre(new Date(c.ultima_atividade_em), hoje)
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/clientes/${c.id}`}
                  className="flex items-center justify-between rounded-md bg-red-100 px-3 py-2 text-xs hover:bg-red-200 transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-red-800 truncate">{c.nome}</p>
                    <p className="text-red-500">{dias}d sem contato</p>
                  </div>
                  <span className="shrink-0 text-red-400">→</span>
                </Link>
              )
            })}
          </AlertaBloco>
        )}

        {/* Alerta 2: Agendamentos próximos (azul) */}
        {agendamentosProximos && agendamentosProximos.length > 0 && (
          <AlertaBloco
            titulo="Agendamentos"
            icone="📅"
            cor="blue"
            subtitulo={`${agendamentosProximos.length} visita${agendamentosProximos.length !== 1 ? 's' : ''} próxima${agendamentosProximos.length !== 1 ? 's' : ''}`}
          >
            {agendamentosProximos.map((a) => {
              const data = new Date(a.data_hora)
              const ehHoje = data.toDateString() === hoje.toDateString()
              const jaTemComparecimento = (a.comparecimentos?.length ?? 0) > 0

              return (
                <Link
                  key={a.id}
                  href={`/dashboard/clientes/${a.cliente_id}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-xs hover:brightness-95 transition ${
                    ehHoje ? 'bg-blue-100' : 'bg-blue-50'
                  } ${jaTemComparecimento ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-800 truncate">
                      {a.clientes?.nome ?? '—'}
                    </p>
                    <p className="text-blue-500">
                      {ehHoje ? 'Hoje' : 'Amanhã'} às{' '}
                      {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {a.empreendimento_interesse && ` · ${a.empreendimento_interesse}`}
                    </p>
                  </div>
                  {jaTemComparecimento && (
                    <span className="shrink-0 text-[10px] text-green-600">✓</span>
                  )}
                </Link>
              )
            })}
          </AlertaBloco>
        )}

        {/* Alerta 3: Documentos pendentes (âmbar) */}
        {documentosPendentes && documentosPendentes.length > 0 && (
          <AlertaBloco
            titulo="Documentos pendentes"
            icone="📄"
            cor="amber"
            subtitulo={`${documentosPendentes.length} doc${documentosPendentes.length !== 1 ? 's' : ''} aguardando validação`}
          >
            {documentosPendentes.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/clientes/${d.cliente_id}`}
                className="flex items-center justify-between rounded-md bg-amber-100 px-3 py-2 text-xs hover:bg-amber-200 transition"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-amber-800 truncate">
                    {d.clientes?.nome ?? '—'}
                  </p>
                  <p className="text-amber-600">
                    {d.tipo === 'COMPROVANTE_RENDA' ? 'Comprov. Renda' : d.tipo}
                    {' · '}
                    {new Date(d.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="shrink-0 text-amber-400">→</span>
              </Link>
            ))}
          </AlertaBloco>
        )}

        {/* Alerta 4: Pós-venda com prazo próximo (índigo) */}
        {posVendaPrazos && posVendaPrazos.length > 0 && (
          <AlertaBloco
            titulo="Pós-venda"
            icone="🏠"
            cor="indigo"
            subtitulo={`${posVendaPrazos.length} cliente${posVendaPrazos.length !== 1 ? 's' : ''} com prazo próximo`}
          >
            {posVendaPrazos.map((c) => {
              const prazo = new Date(c.proxima_acao_em!)
              const dias = diasEntre(hoje, prazo)
              const vencido = dias < 0

              return (
                <Link
                  key={c.id}
                  href={`/dashboard/clientes/${c.id}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition ${
                    vencido ? 'bg-red-100 hover:bg-red-200' : 'bg-indigo-100 hover:bg-indigo-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${vencido ? 'text-red-800' : 'text-indigo-800'}`}>
                      {c.nome}
                    </p>
                    <p className={vencido ? 'text-red-500' : 'text-indigo-500'}>
                      {vencido ? `Venceu há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `Em ${dias}d`}
                      {c.proxima_acao && ` · ${c.proxima_acao.slice(0, 25)}${c.proxima_acao.length > 25 ? '…' : ''}`}
                    </p>
                  </div>
                  <span className={`shrink-0 ${vencido ? 'text-red-400' : 'text-indigo-400'}`}>→</span>
                </Link>
              )
            })}
          </AlertaBloco>
        )}
      </div>
    </div>
  )
}

function AlertaBloco({
  titulo,
  icone,
  cor,
  subtitulo,
  children,
}: {
  titulo: string
  icone: string
  cor: 'red' | 'blue' | 'amber' | 'indigo'
  subtitulo: string
  children: React.ReactNode
}) {
  const cores = {
    red: 'border-red-200 bg-red-50/50',
    blue: 'border-blue-200 bg-blue-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    indigo: 'border-indigo-200 bg-indigo-50/50',
  }

  const coresTitulo = {
    red: 'text-red-800',
    blue: 'text-blue-800',
    amber: 'text-amber-800',
    indigo: 'text-indigo-800',
  }

  return (
    <div className={`rounded-lg border p-4 ${cores[cor]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icone}</span>
        <h3 className={`text-sm font-bold ${coresTitulo[cor]}`}>{titulo}</h3>
        <span className={`text-[11px] font-medium ${coresTitulo[cor]} opacity-70`}>
          {subtitulo}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}