import Link from 'next/link'

interface EquipeDashboardData {
  corretoresAtivos: number
  corretoresOnline: number
  producaoDia: { ligacoes: number; whatsapps: number; agendamentos: number; comparecimentos: number }
}

export default function CardEquipeDashboard({ dados }: { dados: EquipeDashboardData }) {
  return (
    <Link
      href="/dashboard/corretores"
      className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 p-4 shadow-sm hover:bg-blue-100 transition block dark:bg-blue-950/30 dark:hover:bg-blue-900/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-blue-500 dark:text-blue-300">Equipe</p>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-blue-500 dark:text-blue-400">Ativos</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{dados?.corretoresAtivos ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500 dark:text-blue-400">Online hoje</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{dados?.corretoresOnline ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500 dark:text-blue-400">Ligações</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{dados?.producaoDia.ligacoes ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500 dark:text-blue-400">WhatsApp</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{dados?.producaoDia.whatsapps ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-500 dark:text-blue-400">Agendamentos</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{dados?.producaoDia.agendamentos ?? '—'}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-blue-400 dark:text-blue-400">Gerenciar corretores →</p>
    </Link>
  )
}