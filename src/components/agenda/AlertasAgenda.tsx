'use client'

import { AgendaEvent } from '@/src/types'

interface AlertasAgendaProps {
  eventos: AgendaEvent[]
}

export default function AlertasAgenda({ eventos }: AlertasAgendaProps) {
  const agora = new Date()

  // Compromissos de hoje (data_hora entre 00:00 e 23:59 de hoje)
  const hojeStr = agora.toISOString().slice(0, 10)
  const compromissosHoje = eventos.filter((ev) => {
    return ev.agendamento.data_hora.slice(0, 10) === hojeStr
      && ev.agendamento.status !== 'CANCELADO'
  })

  // Compromissos atrasados (data_hora < agora, status ainda pendente)
  const atrasados = eventos.filter((ev) => {
    const dataEv = new Date(ev.agendamento.data_hora)
    return dataEv < agora
      && (ev.agendamento.status === 'AGENDADO' || ev.agendamento.status === 'REMARCADO')
      && !ev.comparecimento
  })

  // Próximos compromissos (futuros, próximos 3 dias)
  const tresDiasFuturo = new Date(agora.getTime() + 3 * 86400000)
  const proximos = eventos.filter((ev) => {
    const dataEv = new Date(ev.agendamento.data_hora)
    return dataEv > agora && dataEv <= tresDiasFuturo
      && ev.agendamento.status !== 'CANCELADO'
  })

  // Próximos já incluídos nos do dia — filtra
  const proximosFiltrados = proximos.filter((ev) => ev.agendamento.data_hora.slice(0, 10) !== hojeStr)

  if (compromissosHoje.length === 0 && atrasados.length === 0 && proximosFiltrados.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {/* Compromissos de hoje */}
      <AlertaCard
        titulo="Hoje"
        cor="bg-blue-50 border-blue-200 text-blue-800"
        eventos={compromissosHoje}
        badgeCor="bg-blue-100 text-blue-600"
      />

      {/* Atrasados */}
      <AlertaCard
        titulo="Atrasados"
        cor="bg-red-50 border-red-200 text-red-800"
        eventos={atrasados}
        badgeCor="bg-red-100 text-red-600"
      />

      {/* Próximos */}
      <AlertaCard
        titulo="Próximos 3 dias"
        cor="bg-amber-50 border-amber-200 text-amber-800"
        eventos={proximosFiltrados}
        badgeCor="bg-amber-100 text-amber-600"
      />
    </div>
  )
}

function AlertaCard({
  titulo,
  cor,
  eventos,
  badgeCor,
}: {
  titulo: string
  cor: string
  eventos: AgendaEvent[]
  badgeCor: string
}) {
  return (
    <div className={`rounded-lg border p-3 ${cor}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide">{titulo}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeCor}`}>
          {eventos.length}
        </span>
      </div>

      {eventos.length === 0 ? (
        <p className="text-[11px] opacity-60">Nenhum compromisso.</p>
      ) : (
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {eventos.slice(0, 5).map((ev) => (
            <div key={ev.agendamento.id} className="text-[11px] flex justify-between">
              <span className="font-medium truncate">{ev.cliente.nome}</span>
              <span className="shrink-0 ml-2 opacity-70">
                {new Date(ev.agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {eventos.length > 5 && (
            <p className="text-[10px] opacity-60">+{eventos.length - 5} mais</p>
          )}
        </div>
      )}
    </div>
  )
}