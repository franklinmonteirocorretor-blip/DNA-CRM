'use client'

import { useState, useRef } from 'react'
import { uploadDocumento } from '@/app/dashboard/clientes/[id]/actions'
import { Documento, TipoDocumento } from '@/src/types'

const TIPOS_DOC: { valor: TipoDocumento; label: string; obrigatorio: boolean }[] = [
  { valor: 'RG', label: 'RG', obrigatorio: true },
  { valor: 'CPF', label: 'CPF', obrigatorio: true },
  { valor: 'CNH', label: 'CNH', obrigatorio: false },
  { valor: 'COMPROVANTE_RENDA', label: 'Comprovante de Renda', obrigatorio: true },
  { valor: 'COMPROVANTE_ENDERECO', label: 'Comprovante de Residência', obrigatorio: false },
  { valor: 'HOLERITE', label: 'Holerite', obrigatorio: false },
  { valor: 'CARTEIRA_TRABALHO', label: 'Carteira de Trabalho', obrigatorio: false },
  { valor: 'EXTRATO_FGTS', label: 'Extrato FGTS', obrigatorio: false },
  { valor: 'FGTS', label: 'FGTS', obrigatorio: false },
  { valor: 'DECLARACAO_IR', label: 'Declaração IR', obrigatorio: false },
  { valor: 'CERTIDAO_NASCIMENTO', label: 'Certidão de Nascimento', obrigatorio: false },
  { valor: 'CERTIDAO_CASAMENTO', label: 'Certidão de Casamento', obrigatorio: false },
  { valor: 'CERTIDAO_CASAMENTO_AVERBACAO', label: 'Certidão Casamento (Averb.)', obrigatorio: false },
  { valor: 'MO_AUTODECLARACAO_DEPENDENTE', label: 'Autodeclaração Dependente', obrigatorio: false },
  { valor: 'CONTRATO', label: 'Contrato', obrigatorio: false },
  { valor: 'PROPOSTA_PDF', label: 'Proposta Assinada', obrigatorio: false },
  { valor: 'OUTRO', label: 'Outro', obrigatorio: false },
]

// Conjunto mínimo para "pasta completa": identidade (RG ou CNH) + CPF + Comprovante de Renda
function verificaPastaCompleta(documentos: Documento[]): boolean {
  const tipos = documentos.map((d) => d.tipo)
  const temIdentidade = tipos.includes('RG') || tipos.includes('CNH')
  const temCpf = tipos.includes('CPF')
  const temRenda = tipos.includes('COMPROVANTE_RENDA')
  return temIdentidade && temCpf && temRenda
}

export default function SecaoDocumentos({
  clienteId,
  documentos,
  pastaCompleta,
}: {
  clienteId: string
  documentos: Documento[]
  pastaCompleta: boolean
}) {
  const [tipo, setTipo] = useState<TipoDocumento | ''>('')
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Documentos agrupados por tipo para exibição organizada
  const docsPorTipo = TIPOS_DOC.reduce(
    (acc, t) => {
      acc[t.valor] = documentos.filter((d) => d.tipo === t.valor)
      return acc
    },
    {} as Record<TipoDocumento, Documento[]>
  )

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()

    if (!tipo || !arquivoSelecionado) {
      setFeedback({ tipo: 'erro', msg: 'Selecione o tipo e um arquivo.' })
      return
    }

    // Limite de 10 MB
    if (arquivoSelecionado.size > 10 * 1024 * 1024) {
      setFeedback({ tipo: 'erro', msg: 'O arquivo deve ter no máximo 10 MB.' })
      return
    }

    // Só aceita imagens e PDFs
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!permitidos.includes(arquivoSelecionado.type)) {
      setFeedback({ tipo: 'erro', msg: 'Formato aceito: JPG, PNG, WebP ou PDF.' })
      return
    }

    setEnviando(true)
    setFeedback(null)

    // Lê o arquivo como base64 no navegador
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string

      const resultado = await uploadDocumento({
        cliente_id: clienteId,
        tipo: tipo as TipoDocumento,
        arquivo_base64: base64,
        nome_arquivo: arquivoSelecionado.name,
      })

      if ('erro' in resultado && resultado.erro) {
        setFeedback({ tipo: 'erro', msg: resultado.erro })
      } else {
        setFeedback({ tipo: 'sucesso', msg: 'Documento enviado!' })
        setArquivoSelecionado(null)
        if (fileRef.current) fileRef.current.value = ''
        // Não reseta o tipo (facilita enviar vários do mesmo tipo)
        setTimeout(() => setFeedback(null), 4000)
      }

      setEnviando(false)
    }

    reader.onerror = () => {
      setFeedback({ tipo: 'erro', msg: 'Erro ao ler o arquivo. Tente novamente.' })
      setEnviando(false)
    }

    reader.readAsDataURL(arquivoSelecionado)
  }

  // Abre o documento em nova aba (URL assinada do Supabase)
  function abrirDocumento(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const totalDocs = documentos.length
  const pastaOk = pastaCompleta

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Documentos
          </h2>
          {totalDocs > 0 && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {totalDocs} arquivo{totalDocs !== 1 ? 's' : ''}
            </span>
          )}
          {pastaOk && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              📁 Pasta completa
            </span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-medium ${ feedback.tipo === 'sucesso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário de upload */}
      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
        {/* Tipo de documento */}
        <div className="min-w-[160px]">
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumento | '')}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecionar tipo...</option>
            {TIPOS_DOC.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Arquivo */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
            Arquivo (JPG, PNG, WebP, PDF — máx. 10 MB)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setArquivoSelecionado(e.target.files?.[0] ?? null)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 text-sm shadow-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={enviando || !tipo || !arquivoSelecionado}
          className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 h-fit"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {/* Lista de documentos por tipo */}
      {totalDocs > 0 && (
        <div className="space-y-3">
          {TIPOS_DOC.map((t) => {
            const docs = docsPorTipo[t.valor]
            if (docs.length === 0) return null

            return (
              <div key={t.valor}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                  {t.label} {t.obrigatorio ? '(obrigatório)' : ''}
                </p>
                <div className="space-y-1">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Ícone indicando tipo de arquivo */}
                        <span className="shrink-0 text-gray-400 dark:text-gray-500">
                          {doc.arquivo_url.endsWith('.pdf') || doc.arquivo_url.includes('.pdf') ? '📄' : '🖼️'}
                        </span>

                        {/* Info */}
                        <div className="min-w-0">
                          <p className="text-gray-700 dark:text-gray-300 font-medium truncate">
                            {doc.tipo === 'COMPROVANTE_RENDA' ? 'Comprovante' : doc.tipo}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {/* Status + Download */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status de validação */}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ doc.status_validacao === 'VALIDADO' ? 'bg-green-100 text-green-600' : doc.status_validacao === 'REJEITADO' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600' }`}
                        >
                          {doc.status_validacao === 'VALIDADO'
                            ? '✓ OK'
                            : doc.status_validacao === 'REJEITADO'
                              ? '✗ Rejeitado'
                              : 'Pendente'}
                        </span>

                        {/* Botão abrir */}
                        <button
                          type="button"
                          onClick={() => abrirDocumento(doc.arquivo_url)}
                          className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Estado vazio */}
      {totalDocs === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 p-6 text-center">
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Nenhum documento enviado</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Envie RG, CPF e Comprovante de Renda para completar a pasta
          </p>
        </div>
      )}
    </div>
  )
}