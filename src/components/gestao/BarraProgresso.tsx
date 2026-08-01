export default function BarraProgresso({
  valor,
  meta,
  label,
}: {
  valor: number
  meta: number
  label: string
}) {
  const pct = meta > 0 ? Math.min(100, Math.round((valor / meta) * 100)) : 0
  const corBarra = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${corBarra}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">
        {valor}/{meta}
      </span>
      <span className="w-8 text-right text-gray-400 dark:text-gray-500">{pct}%</span>
    </div>
  )
}