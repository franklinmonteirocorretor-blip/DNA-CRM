'use client'

import { useState, useEffect } from 'react'
import {
  clienteDossie,
  aprovarDocumento,
  rejeitarDocumento,
} from '@/app/dashboard/documentos/actions'
import { ClienteDossie, TIPO_DOCUMENTO_LABEL, Documento } from '@/src/types'

const STATUS_COR: Record<string, string> = {
  VALIDADO: 'bg-emerald-100 text-emerald-700',
  PENDENTE: 'bg-gray-100 text-gray-600',
  RECEBIDO: 'bg-blue-100 text-blue-700',
  EM_ANALISE: 'bg-amber-100 text-amber-700',
  REJEITADO: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  VALIDADO: 'Aprovado',
  PENDENTE: 'Pendente',
  RECEBIDO: 'Recebido',
  EM_ANALISE: 'Em análise',
  REJEITADO: 'Rejeitado',
}

export default function ChecklistDocumentos({ clienteId }: { clienteId: string }) {
  const [dados, setDados] = useState<ClienteDossie | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [docRejeitando, setDocRejeitando] = useState<string | null>(null)

  const carregar = async () => {
    setCarregando(true)
    const d = await clienteDossie(clienteId)
    setDados(d)
    setCarregando(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregar e async que seta estado; useEffect apenas dispara o carregamento inicial
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function onAprovar(docId: string) {
    await aprovarDocumento(docId)
    carregar()
  }

  async function onRejeitar(docId: string) {
    if (!motivoRejeicao.trim()) return
    await rejeitarDocumento(docId, motivoRejeicao)
    setMotivoRejeicao('')
    setDocRejeitando(null)
    carregar()
  }

  if (carregando) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-400 animate-pulse">Carregando checklist...</p>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-red-500">Cliente não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Checklist Documental</h3>
        {dados.checklistCompleto ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            ✓ Completo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            {dados.faltantes.length} pendente{dados.faltantes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Obrigatórios faltantes */}
      {dados.faltantes.length > 0 && (
        <div className="mb-3 rounded-md bg-red-50 p-2.5 text-xs">
          <p className="font-semibold text-red-800 mb-1">Documentos obrigatórios faltantes:</p>
          <div className="flex flex-wrap gap-1">
            {dados.faltantes.map((t) => (
              <span key={t} className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                {TIPO_DOCUMENTO_LABEL[t]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      {dados.documentos.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum documento enviado.</p>
      ) : (
        <div className="space-y-1.5">
          {dados.documentos.map((doc: Documento) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 p-2.5 text-xs">
              <div className="flex items-center gap-2 flex-1">
                <span className={`font-medium ${dados.checklistObrigatorio.includes(doc.tipo) ? 'text-gray-800' : 'text-gray-400'}`}>
                  {TIPO_DOCUMENTO_LABEL[doc.tipo]}
                </span>
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_COR[doc.status_validacao] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LABEL[doc.status_validacao] ?? doc.status_validacao}
                </span>
                {doc.versao > 1 && <span className="text-[9px] text-gray-400">v{doc.versao}</span>}
                {doc.vencimento && <span className="text-[9px] text-gray-400">Venc: {new Date(doc.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.arquivo_url && (
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    className="rounded px-2 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                    Ver
                  </a>
                )}
                {doc.status_validacao !== 'VALIDADO' && (
                  <button onClick={() => onAprovar(doc.id)}
                    className="rounded px-2 py-0.5 text-[9px] font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                    ✓ Aprovar
                  </button>
                )}
                {doc.status_validacao !== 'REJEITADO' && (
                  <button onClick={() => setDocRejeitando(doc.id)}
                    className="rounded px-2 py-0.5 text-[9px] font-medium bg-red-100 text-red-700 hover:bg-red-200">
                    ✕ Rejeitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rejeição */}
      {docRejeitando && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-sm font-semibold text-gray-900">Rejeitar documento</p>
            <p className="text-xs text-gray-500 mt-1">Informe o motivo da rejeição:</p>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 resize-none h-20"
              placeholder="Documento ilegível, vencido, incorreto..."
            />
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => { setDocRejeitando(null); setMotivoRejeicao('') }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => onRejeitar(docRejeitando)}
                disabled={!motivoRejeicao.trim()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}