'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface SerieDados {
  label: string
  data: { dia: string; valor: number }[]
}

interface ProdutividadeChartProps {
  series: SerieDados[]
}

const cores = ['#3b82f6', '#22c55e', '#a855f7', '#f97316']

function formatarDia(dia: string): string {
  const partes = dia.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`
  }
  return dia
}

export default function ProdutividadeChart({ series }: ProdutividadeChartProps) {
  if (!series.length) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum dado de produtividade disponível.
      </div>
    )
  }

  const todasDatas = new Set<string>()
  series.forEach((s) => s.data.forEach((d) => todasDatas.add(d.dia)))
  const diasOrdenados = Array.from(todasDatas).sort()

  const dadosUnificados = diasOrdenados.map((dia) => {
    const ponto: Record<string, string | number> = { dia: formatarDia(dia) }
    series.forEach((s) => {
      const encontrado = s.data.find((d) => d.dia === dia)
      ponto[s.label] = encontrado ? encontrado.valor : 0
    })
    return ponto
  })

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Produtividade por Equipe</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dadosUnificados}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
            iconSize={8}
          />
          {series.map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={cores[i % cores.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}