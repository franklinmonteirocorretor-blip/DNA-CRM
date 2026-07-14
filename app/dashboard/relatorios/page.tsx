'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIPOS_RELATORIO = [
  { valor: 'producao', rotulo: 'Produção Diária', descricao: 'Ligações, WhatsApp, agendamentos, comparecimentos e pontuação por dia.' },
  { valor: 'funil', rotulo: 'Funil de Vendas', descricao: 'Distribuição de clientes por etapa, taxas de conversão e resumo.' },
  { valor: 'clientes', rotulo: 'Lista de Clientes', descricao: 'Dados completos: nome, CPF, telefone, etapa, documentos e status.' },
  { valor: 'financeiro', rotulo: 'Financeiro (VGV e Comissões)', descricao: 'Fechamentos com VGV, percentual e valor de comissão por cliente.' },
]

export default function RelatoriosPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState('producao')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())
    return d.toISOString().slice(0, 10)
  })
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerarRelatorio(formato: 'excel' | 'pdf') {
    setGerando(true)
    setErro('')

    try {
      const params = new URLSearchParams({ tipo, dataInicio, dataFim })
      const res = await fetch(`/api/relatorios/${formato}?${params.toString()}`)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ erro: 'Erro ao gerar relatório.' }))
        setErro(body.erro ?? 'Erro ao gerar relatório.')
        setGerando(false)
        return
      }

      // Download do arquivo
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extensao = formato === 'excel' ? 'csv' : 'html'
      const nomeArquivo = `relatorio-${tipo}-${dataInicio}_${dataFim}.${extensao}`
      a.download = nomeArquivo
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setErro('Erro de conexão ao gerar o relatório.')
    }

    setGerando(false)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gere relatórios exportáveis em Excel ou PDF com os dados do período selecionado.
        </p>
      </div>

      {/* Erro */}
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Seleção de tipo */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Tipo de relatório</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {TIPOS_RELATORIO.map((t) => (
            <label
              key={t.valor}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                tipo === t.valor
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={(e) => setTipo(e.target.value)}
                className="mt-0.5 h-4 w-4 text-blue-600"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{t.rotulo}</p>
                <p className="mt-0.5 text-xs text-gray-500">{t.descricao}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Período */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Período</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700">
              Data de início
            </label>
            <input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700">
              Data de fim
            </label>
            <input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Botões de exportação */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => gerarRelatorio('excel')}
          disabled={gerando}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
        >
          📊 {gerando ? 'Gerando...' : 'Exportar Excel (CSV)'}
        </button>
        <button
          onClick={() => gerarRelatorio('pdf')}
          disabled={gerando}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
        >
          📄 {gerando ? 'Gerando...' : 'Exportar PDF (HTML)'}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        O PDF é gerado como HTML formatado. Abra o arquivo no navegador e use Ctrl+P → Salvar como PDF.
      </p>
    </div>
  )
}