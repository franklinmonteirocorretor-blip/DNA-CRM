'use client'

// ─── Ações de Gestão por Linha (Sprint 13) ─────────────────────────────────
// Componente cliente com botões de ação por linha da tabela de comissões.
// Suporta loading individual por botão e auto-dismiss da mensagem.

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { registrarRecebimento, cancelarComissao, reativarComissao } from '@/app/dashboard/financeiro/actions'
import type { ComissaoStatus } from '@/src/types/financeiro'

interface ComissaoAcoesProps {
  clienteId: string
  statusAtual: ComissaoStatus
  /** Callback opcional para notificar o componente pai da mudança de status */
  onStatusChange?: (novoStatus: ComissaoStatus) => void
}

type AcaoTipo = 'RECEBIDA' | 'CANCELADA' | 'REATIVADA'

const LABEL_ACAO: Record<AcaoTipo, string> = {
  RECEBIDA: 'Registrar recebimento',
  CANCELADA: 'Cancelar',
  REATIVADA: 'Reativar',
}

/** Retorna quais botões mostrar com base no status atual */
function botoesVisiveis(status: ComissaoStatus): AcaoTipo[] {
  switch (status) {
    case 'PREVISTA':
      return ['RECEBIDA', 'CANCELADA']
    case 'RECEBIDA':
      return ['CANCELADA']
    case 'CANCELADA':
      return ['REATIVADA']
    default:
      return []
  }
}

export default function ComissaoAcoes({ clienteId, statusAtual, onStatusChange }: ComissaoAcoesProps) {
  const router = useRouter()
  const [loadingAcao, setLoadingAcao] = useState<AcaoTipo | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [statusLocal, setStatusLocal] = useState<ComissaoStatus>(statusAtual)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss da mensagem após 4 segundos
  useEffect(() => {
    if (mensagem) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setMensagem(null), 4000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [mensagem])

  // Sincroniza statusLocal quando o pai mudar o status (ex: refresh da página)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatusLocal(statusAtual)
  }, [statusAtual])

  async function executarAcao(acao: AcaoTipo) {
    setLoadingAcao(acao)
    setMensagem(null)

    try {
      const fn =
        acao === 'RECEBIDA' ? registrarRecebimento :
        acao === 'CANCELADA' ? cancelarComissao :
        reativarComissao

      const res = await fn(clienteId)
      if (res.sucesso) {
        const novoStatus: ComissaoStatus =
          acao === 'RECEBIDA' ? 'RECEBIDA' :
          acao === 'CANCELADA' ? 'CANCELADA' :
          'PREVISTA'

        setStatusLocal(novoStatus)
        onStatusChange?.(novoStatus)
        setMensagem({ tipo: 'sucesso', texto: `Ação "${LABEL_ACAO[acao]}" registrada.` })
        // Atualiza a página para refletir o novo status em todos os componentes
        router.refresh()
      } else {
        setMensagem({ tipo: 'erro', texto: res.erro || 'Erro ao executar ação.' })
      }
    } catch (err: unknown) {
      setMensagem({ tipo: 'erro', texto: (err as Error)?.message ?? 'Erro inesperado.' })
    } finally {
      setLoadingAcao(null)
    }
  }

  const visiveis = botoesVisiveis(statusLocal)

  if (visiveis.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        {visiveis.map((acao) => {
          const estaCarregando = loadingAcao === acao
          const classes =
            acao === 'RECEBIDA'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : acao === 'CANCELADA'
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'

          return (
            <button
              key={acao}
              type="button"
              disabled={estaCarregando}
              onClick={() => executarAcao(acao)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${classes}`}
            >
              {estaCarregando ? '...' : LABEL_ACAO[acao]}
            </button>
          )
        })}
      </div>
      {mensagem && (
        <span
          className={`text-[10px] ${mensagem.tipo === 'sucesso' ? 'text-emerald-600' : 'text-red-500'}`}
        >
          {mensagem.texto}
        </span>
      )}
    </div>
  )
}