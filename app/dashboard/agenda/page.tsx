import CalendarioAgenda from '@/src/components/agenda/CalendarioAgenda'

export const dynamic = 'force-dynamic'

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie seus compromissos, visitas e agendamentos.
        </p>
      </div>

      <CalendarioAgenda />
    </div>
  )
}