'use client'

import type { BIFunilEtapa } from '@/src/types/bi'
import { formatarMoeda } from '@/src/lib/formatters'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Props {
  etapas: BIFunilEtapa[]
}

const GRADIENTE_ETAPAS: Record<string, string> = {
  NOVO_LEAD: '#9CA3AF',
  CONTATOS: '#F97316',
  AGENDAMENTO: '#EAB308',
  COMPARECIMENTO: '#3B82F6',
  ANALISE: '#6366F1',
  RESTRICOES: '#EC4899',
  CONDICIONADOS: '#14B8A6',
  APROVADOS: '#06B6D4',
  FECHAMENTOS: '#22C55E',
}

function corPorEtapa(etapa: string): string {
  return GRADIENTE_ETAPAS[etapa] ?? '#6B7280'
}

function formatarPercentual(valor: number | null): string {
  if (valor === null || valor === undefined) return '—'
  return Math.round(valor) + '%'
}

interface CustomBarLabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  index?: number
  payload?: BIFunilEtapa & { conversaoLabel?: string }
}

function BarraLabel(props: CustomBarLabelProps) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, payload } = props
  if (!payload) return null

  const label = payload.conversaoLabel ?? '—'
  const centerY = y + height / 2

  return (
    <g>
      <text
        x={x + width + 6}
        y={centerY + 4}
        fill="#4B5563"
        fontSize={12}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  )
}

function CustomTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: BIFunilEtapa }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{d.label}</p>
      <p className="text-gray-600 dark:text-gray-400 mt-1">Quantidade: {d.quantidade}</p>
      <p className="text-gray-600 dark:text-gray-400">Conversão: {d.conversao !== null ? formatarPercentual(d.conversao) : '—'}</p>
      <p className="text-gray-600 dark:text-gray-400">Perda: {d.perda}</p>
      <p className="text-gray-600 dark:text-gray-400">VGV: {formatarMoeda(d.vgv)}</p>
      <p className="text-gray-600 dark:text-gray-400">Tempo médio: {d.tempoMedioDias} dias</p>
    </div>
  )
}

export default function FunilBIChart({ etapas }: { etapas: BIFunilEtapa[] }) {
  const ordenadas = [...etapas].sort((a, b) => b.ordem - a.ordem)
  const maxQtde = Math.max(...ordenadas.map((e) => e.quantidade), 1)

  const dados = ordenadas.map((e) => ({
    ...e,
    conversaoLabel: e.conversao !== null ? formatarPercentual(e.conversao) : '—',
    barWidth: Math.max((e.quantidade / maxQtde) * 70, 8),
  }))

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm border p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Funil Executivo</h3>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4B5563', fontSize: 12 }}
              width={110}
            />
            <Tooltip content={<CustomTooltipContent />} />
            <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} label={undefined}>
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={corPorEtapa(entry.etapa)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}