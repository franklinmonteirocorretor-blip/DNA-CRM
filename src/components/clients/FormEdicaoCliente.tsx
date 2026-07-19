'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { editarCliente, EditarClienteInput } from '@/app/dashboard/clientes/[id]/actions'
import SelectEmpreendimento from '@/src/components/clients/SelectEmpreendimento'
import type { Cliente, Conjuge, EtapaFunil } from '@/src/types'

// Labels e cores — replicados da ficha para consistência visual
const ETAPA_LABEL: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'Novo Lead',
  CONTATOS: 'Contatos',
  AGENDAMENTO: 'Agendamento',
  COMPARECIMENTO: 'Comparecimento',
  ANALISE: 'Análise',
  RESTRICOES: 'Restrições',
  CONDICIONADOS: 'Condicionados',
  APROVADOS: 'Aprovados',
  FECHAMENTOS: 'Fechamentos',
  POS_VENDA: 'Pós-Venda',
}

const ETAPA_COR: Record<EtapaFunil, string> = {
  NOVO_LEAD: 'bg-gray-100 text-gray-700',
  CONTATOS: 'bg-yellow-100 text-yellow-700',
  AGENDAMENTO: 'bg-blue-100 text-blue-700',
  COMPARECIMENTO: 'bg-purple-100 text-purple-700',
  ANALISE: 'bg-orange-100 text-orange-700',
  RESTRICOES: 'bg-red-100 text-red-700',
  CONDICIONADOS: 'bg-pink-100 text-pink-700',
  APROVADOS: 'bg-teal-100 text-teal-700',
  FECHAMENTOS: 'bg-green-100 text-green-700',
  POS_VENDA: 'bg-indigo-100 text-indigo-700',
}

// Máscaras para CPF e telefone enquanto o usuário digita
function mascaraCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

function mascaraTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

interface FormEdicaoClienteProps {
  cliente: Cliente
  conjuge: Conjuge | null
  cpfFormatado: string
  telFormatado: string
  rendaFormatada: string
  fgtsFormatado: string
  criadoEm: string
  ultimaAtividade: string
  diasSemContato: number
  pastaCompleta: boolean
}

export default function FormEdicaoCliente(props: FormEdicaoClienteProps) {
  const {
    cliente,
    conjuge,
    cpfFormatado,
    telFormatado,
    rendaFormatada,
    fgtsFormatado,
    criadoEm,
    ultimaAtividade,
    diasSemContato,
  } = props

  const router = useRouter()

  // Alternar entre modo visualização e modo edição
  const [modoEdicao, setModoEdicao] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null)

  // Campos controlados com valores iniciais do cliente
  const [nome, setNome] = useState(cliente.nome)
  const [cpf, setCpf] = useState(cliente.cpf.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    '$1.$2.$3-$4'
  ))
  const [telefone, setTelefone] = useState(
    cliente.telefone.length === 11
      ? `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 7)}-${cliente.telefone.slice(7)}`
      : `(${cliente.telefone.slice(0, 2)}) ${cliente.telefone.slice(2, 6)}-${cliente.telefone.slice(6)}`
  )
  const [email, setEmail] = useState(cliente.email ?? '')
  const [renda, setRenda] = useState(cliente.renda?.toString() ?? '')
  const [dependentes, setDependentes] = useState(cliente.dependentes.toString())
  const [tempoClt, setTempoClt] = useState(cliente.tempo_clt_meses?.toString() ?? '')
  const [saldoFgts, setSaldoFgts] = useState(cliente.saldo_fgts.toString())
  const [ehCasado, setEhCasado] = useState(cliente.eh_casado)
  const [observacoes, setObservacoes] = useState(cliente.observacoes ?? '')

  // Função utilitária para refletir o refresh da página
  const refreshPagina = useCallback(() => {
    router.refresh()
  }, [router])

  // Retorna ao modo visualização sem salvar
  function cancelarEdicao() {
    setModoEdicao(false)
    setErros([])
    setSucessoMsg(null)
  }

  // Submete as alterações
  async function handleSalvarEdicao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEnviando(true)
    setErros([])
    setSucessoMsg(null)

    // Sanitiza campos antes de enviar
    const cpfRaw = cpf.replace(/\D/g, '')
    const telefoneRaw = telefone.replace(/\D/g, '')
    const rendaNum = renda.trim() ? parseFloat(renda.trim()) : null
    const dependentesNum = parseInt(dependentes, 10) || 0
    const tempoCltNum = tempoClt.trim() ? parseInt(tempoClt.trim(), 10) : null
    const saldoFgtsNum = parseFloat(saldoFgts) || 0

    // Validação client-side rápida
    const clientErros: string[] = []

    if (!nome || nome.trim().length < 3) {
      clientErros.push('O nome deve ter pelo menos 3 caracteres.')
    }

    if (cpfRaw.length !== 11) {
      clientErros.push('O CPF deve ter exatamente 11 dígitos.')
    }

    if (telefoneRaw.length < 10) {
      clientErros.push('O telefone deve ter 10 ou 11 dígitos (com DDD).')
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      clientErros.push('O e-mail informado não é válido.')
    }

    if (rendaNum !== null && isNaN(rendaNum)) {
      clientErros.push('A renda informada não é um número válido.')
    }

    if (isNaN(dependentesNum) || dependentesNum < 0 || dependentesNum > 20) {
      clientErros.push('Dependentes deve ser um número entre 0 e 20.')
    }

    if (tempoCltNum !== null && (isNaN(tempoCltNum) || tempoCltNum < 0)) {
      clientErros.push('O tempo de CLT deve ser um número positivo.')
    }

    if (isNaN(saldoFgtsNum) || saldoFgtsNum < 0) {
      clientErros.push('O saldo FGTS deve ser um número positivo.')
    }

    if (clientErros.length > 0) {
      setErros(clientErros)
      setEnviando(false)
      return
    }

    const formEl = e.currentTarget
    const empreendimentoRaw = (formEl.elements.namedItem('empreendimento_id') as HTMLSelectElement)?.value || ''
    const empreendimentoIdFinal = empreendimentoRaw || null

    const input: EditarClienteInput = {
      cliente_id: cliente.id,
      nome: nome.trim(),
      cpf: cpfRaw,
      telefone: telefoneRaw,
      email: email.trim() || null,
      renda: rendaNum,
      dependentes: dependentesNum,
      tempo_clt_meses: tempoCltNum,
      saldo_fgts: saldoFgtsNum,
      eh_casado: ehCasado,
      empreendimento_id: empreendimentoIdFinal,
      observacoes: observacoes.trim() || null,
    }

    const resultado = await editarCliente(input)

    if (resultado?.erros) {
      setErros(resultado.erros)
      setEnviando(false)
      return
    }

    // Sucesso
    setEnviando(false)
    setSucessoMsg('Dados do cliente atualizados com sucesso!')
    setModoEdicao(false)
    // Recarrega os dados da página
    refreshPagina()
  }

  // ──── Renderização ──────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ETAPA_COR[cliente.etapa_atual]}`}>
              {ETAPA_LABEL[cliente.etapa_atual]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Cliente desde {criadoEm} · Última atividade: {ultimaAtividade}
            {diasSemContato >= 3 && (
              <span className="ml-2 text-orange-500 font-medium">
                ({diasSemContato}d sem contato)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Editar / Cancelar Edição */}
          {!modoEdicao ? (
            <button
              type="button"
              onClick={() => setModoEdicao(true)}
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              ✏️ Editar
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}

          {/* Botão Voltar (se não estiver em edição, senão só Cancelar acima) */}
          {!modoEdicao && (
            <Link
              href="/dashboard/clientes"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              ← Voltar
            </Link>
          )}
        </div>
      </div>

      {/* Alerta de sucesso */}
      {sucessoMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">{sucessoMsg}</p>
        </div>
      )}

      {/* ──── Modo EDIÇÃO ──── */}
      {modoEdicao && (
        <>
          {/* Lista de erros */}
          {erros.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                Corrija {erros.length === 1 ? 'o erro abaixo' : 'os erros abaixo'} antes de salvar:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
                {erros.map((erro, i) => (
                  <li key={i}>{erro}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <form onSubmit={handleSalvarEdicao} className="space-y-6">
              {/* Seção 1: Dados pessoais */}
              <div className="border-b pb-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Dados pessoais{' '}
                  <span className="text-xs font-normal text-gray-400">(obrigatórios)</span>
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Nome */}
                  <div>
                    <label htmlFor="edit-nome" className="block text-sm font-medium text-gray-700">
                      Nome *
                    </label>
                    <input
                      id="edit-nome"
                      name="nome"
                      type="text"
                      required
                      maxLength={200}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo do cliente"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* CPF */}
                  <div>
                    <label htmlFor="edit-cpf" className="block text-sm font-medium text-gray-700">
                      CPF *
                    </label>
                    <input
                      id="edit-cpf"
                      name="cpf"
                      type="text"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(mascaraCPF(e.target.value))}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <label htmlFor="edit-telefone" className="block text-sm font-medium text-gray-700">
                      Telefone *
                    </label>
                    <input
                      id="edit-telefone"
                      name="telefone"
                      type="text"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                      maxLength={15}
                      placeholder="(86) 99999-0000"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">
                      E-mail <span className="text-xs font-normal text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="edit-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Informações financeiras */}
              <div className="border-b pb-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Informações financeiras{' '}
                  <span className="text-xs font-normal text-gray-400">(opcionais)</span>
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Renda */}
                  <div>
                    <label htmlFor="edit-renda" className="block text-sm font-medium text-gray-700">
                      Renda mensal
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400">
                        R$
                      </span>
                      <input
                        id="edit-renda"
                        name="renda"
                        type="number"
                        min={0}
                        step={0.01}
                        value={renda}
                        onChange={(e) => setRenda(e.target.value)}
                        placeholder="0,00"
                        className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Dependentes */}
                  <div>
                    <label htmlFor="edit-dependentes" className="block text-sm font-medium text-gray-700">
                      Dependentes
                    </label>
                    <input
                      id="edit-dependentes"
                      name="dependentes"
                      type="number"
                      min={0}
                      max={20}
                      value={dependentes}
                      onChange={(e) => setDependentes(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tempo CLT */}
                  <div>
                    <label htmlFor="edit-tempo-clt" className="block text-sm font-medium text-gray-700">
                      Tempo CLT (meses)
                    </label>
                    <input
                      id="edit-tempo-clt"
                      name="tempo_clt_meses"
                      type="number"
                      min={0}
                      value={tempoClt}
                      onChange={(e) => setTempoClt(e.target.value)}
                      placeholder="12"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Saldo FGTS */}
                  <div>
                    <label htmlFor="edit-saldo-fgts" className="block text-sm font-medium text-gray-700">
                      Saldo FGTS
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400">
                        R$
                      </span>
                      <input
                        id="edit-saldo-fgts"
                        name="saldo_fgts"
                        type="number"
                        min={0}
                        step={0.01}
                        value={saldoFgts}
                        onChange={(e) => setSaldoFgts(e.target.value)}
                        placeholder="0,00"
                        className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Estado civil + Empreendimento */}
              <div className="border-b pb-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Estado civil e empreendimento
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Eh casado? */}
                  <div className="flex items-center gap-3">
                    <input
                      id="edit-eh-casado"
                      name="eh_casado"
                      type="checkbox"
                      checked={ehCasado}
                      onChange={(e) => setEhCasado(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="edit-eh-casado" className="text-sm font-medium text-gray-700">
                      Cliente é casado(a)?
                    </label>
                  </div>

                  {/* Empreendimento */}
                  <div>
                    <label htmlFor="edit-empreendimento" className="block text-sm font-medium text-gray-700">
                      Empreendimento de interesse
                    </label>
                    <SelectEmpreendimento
                      key={`emp-${cliente.id}`}
                      name="empreendimento_id"
                      valorSelecionado={cliente.empreendimento_id ?? undefined}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Observações */}
              <div>
                <label htmlFor="edit-observacoes" className="block text-sm font-medium text-gray-700">
                  Observações <span className="text-xs font-normal text-gray-400">(opcional)</span>
                </label>
                <textarea
                  id="edit-observacoes"
                  name="observacoes"
                  rows={3}
                  maxLength={1000}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações livres sobre o cliente..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Botões de ação */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {enviando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ──── Modo VISUALIZAÇÃO (cards originais) ──── */}
      {!modoEdicao && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Coluna Esquerda — Dados pessoais e financeiros */}
          <div className="space-y-6">
            {/* Card: Dados pessoais */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Dados pessoais
              </h2>
              <dl className="mt-3 space-y-3">
                <InfoItem label="CPF" value={cpfFormatado} />
                <InfoItem label="Telefone" value={telFormatado} />
                {cliente.email && <InfoItem label="E-mail" value={cliente.email} />}
                <InfoItem label="Dependentes" value={String(cliente.dependentes)} />
              </dl>
            </div>

            {/* Card: Informações financeiras */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Informações financeiras
              </h2>
              <dl className="mt-3 space-y-3">
                <InfoItem label="Renda mensal" value={rendaFormatada} />
                <InfoItem label="Saldo FGTS" value={fgtsFormatado} />
                {cliente.tempo_clt_meses != null && (
                  <InfoItem label="Tempo CLT" value={`${cliente.tempo_clt_meses} meses`} />
                )}
              </dl>
            </div>

            {/* Card: Observações */}
            {cliente.observacoes && (
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Observações
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {cliente.observacoes}
                </p>
              </div>
            )}
          </div>

          {/* Coluna Direita — Cônjuge + Status do funil */}
          <div className="space-y-6">
            {/* Card: Cônjuge */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Cônjuge
              </h2>
              {cliente.eh_casado && conjuge ? (
                <dl className="mt-3 space-y-3">
                  <InfoItem label="Nome" value={conjuge.nome || 'Não informado'} />
                  {conjuge.cpf && (
                    <InfoItem
                      label="CPF"
                      value={conjuge.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    />
                  )}
                  {conjuge.renda != null && (
                    <InfoItem
                      label="Renda mensal"
                      value={`R$ ${conjuge.renda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                  )}
                  <InfoItem
                    label="Saldo FGTS"
                    value={`R$ ${conjuge.saldo_fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  {conjuge.tempo_clt_meses != null && (
                    <InfoItem label="Tempo CLT" value={`${conjuge.tempo_clt_meses} meses`} />
                  )}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-gray-400">
                  {cliente.eh_casado ? 'Cônjuge ainda não cadastrado.' : 'Cliente não é casado.'}
                </p>
              )}
            </div>

            {/* Card: Status no funil */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Status no funil
              </h2>
              <dl className="mt-3 space-y-3">
                <InfoItem label="Etapa atual" value={ETAPA_LABEL[cliente.etapa_atual]} />
                {cliente.empreendimento_interesse && (
                  <InfoItem label="Empreendimento" value={cliente.empreendimento_interesse} />
                )}
                {cliente.resultado_analise && (
                  <InfoItem label="Resultado análise" value={cliente.resultado_analise} />
                )}
                {cliente.data_fechamento && (
                  <InfoItem
                    label="Data fechamento"
                    value={new Date(cliente.data_fechamento).toLocaleDateString('pt-BR')}
                  />
                )}
                {cliente.ficha_proposta_assinada && (
                  <InfoItem label="Ficha proposta" value="Assinada ✅" />
                )}
                {/* pastaCompleta vem do servidor (pasta_completa_em ou calculado via docs) */}
                {cliente.pasta_completa_em && (
                  <InfoItem
                    label="Pasta completa"
                    value={`${new Date(cliente.pasta_completa_em).toLocaleDateString('pt-BR')} 📁`}
                  />
                )}
                {cliente.proxima_acao && (
                  <InfoItem label="Próxima ação" value={cliente.proxima_acao} />
                )}
                {cliente.proxima_acao_em && (
                  <InfoItem
                    label="Prazo próxima ação"
                    value={new Date(cliente.proxima_acao_em).toLocaleDateString('pt-BR')}
                  />
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Micro-componente para pares label → valor nos cards
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 text-right">{value}</dd>
    </div>
  )
}