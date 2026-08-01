'use client'

import { useMemo } from 'react'

interface HoraDado {
  hora: number
  valor: number
}

interface CorretorDado {
  corretorId: string
  nome: string
  horas: HoraDado[]
}

interface HeatmapProducaoProps {
  dados: CorretorDado[]
}

function corCelula(valor: number): string {
  if (valor >= 13) return 'bg-red-500'
  if (valor >= 8) return 'bg-orange-400'
  if (valor >= 4) return 'bg-green-400'
  if (valor >= 1) return 'bg-blue-400'
  return 'bg-gray-200'
}

function textoCelula(valor: number): string {
  if (valor >= 13) return 'text-white'
  if (valor >= 8) return 'text-white'
  if (valor >= 4) return 'text-white'
  if (valor >= 1) return 'text-white'
  return 'text-gray-400'
}

export default function HeatmapProducao({ dados }: HeatmapProducaoProps) {
  const top10 = useMemo(
    () =>
      [...dados]
        .sort((a, b) => {
          const totalA = a.horas.reduce((s, h) => s + h.valor, 0)
          const totalB = b.horas.reduce((s, h) => s + h.valor, 0)
          return totalB - totalA
        })
        .slice(0, 10),
    [dados]
  )

  const horas = Array.from({ length: 24 }, (_, i) => i)

  if (!dados.length) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        Nenhum dado de produção disponível.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: `150px repeat(24, 1fr)` }}
      >
        <div className="bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-600">
          Corretor
        </div>
        {horas.map((h) => (
          <div
            key={h}
            className="bg-gray-50 dark:bg-gray-700 px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600"
          >
            {String(h).padStart(2, '0')}h
          </div>
        ))}

        {top10.map((corretor) => {
          const mapaHoras = new Map<number, number>()
          corretor.horas.forEach((h) => mapaHoras.set(h.hora, h.valor))

          return (
            <div key={corretor.corretorId} className="contents">
              <div className="px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 truncate border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                {corretor.nome}
              </div>
              {horas.map((h) => {
                const val = mapaHoras.get(h) ?? 0
                return (
                  <div
                    key={h}
                    className={`${corCelula(val)} ${textoCelula(val)} m-0.5 flex items-center justify-center rounded text-[10px] font-medium border-b border-gray-100 dark:border-gray-700 relative group`}
                    title={`${corretor.nome} — ${String(h).padStart(2, '0')}h: ${val} atividades`}
                  >
                    {val > 0 ? val : ''}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}