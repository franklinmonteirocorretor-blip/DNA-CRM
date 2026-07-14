import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { Empreendimento } from '@/src/types'
import Link from 'next/link'
import FormAlternarAtivo from './FormAlternarAtivo'

export default async function EmpreendimentosPage() {
  const supabase = await createSupabaseServerClient()

  const { data: empreendimentos, error } = await supabase
    .from('empreendimentos')
    .select('*')
    .is('deleted_at', null)
    .order('nome', { ascending: true })
    .returns<Empreendimento[]>()

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-semibold">Erro ao carregar empreendimentos</h2>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    )
  }

  const lista = empreendimentos ?? []
  const ativos = lista.filter((e) => e.ativo)
  const inativos = lista.filter((e) => !e.ativo)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empreendimentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {lista.length} empreendimento{lista.length !== 1 ? 's' : ''} cadastrado{lista.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/empreendimentos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          + Novo Empreendimento
        </Link>
      </div>

      {/* Estado vazio */}
      {lista.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            Nenhum empreendimento cadastrado ainda.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre os empreendimentos para usar nos formulários de cliente e agendamento.
          </p>
        </div>
      )}

      {/* Lista de ativos */}
      {ativos.length > 0 && (
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Ativos ({ativos.length})
            </h2>
          </div>
          {ativos.map((emp) => (
            <EmpreendimentoLinha key={emp.id} empreendimento={emp} />
          ))}
        </div>
      )}

      {/* Lista de inativos */}
      {inativos.length > 0 && (
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Inativos ({inativos.length})
            </h2>
          </div>
          {inativos.map((emp) => (
            <EmpreendimentoLinha key={emp.id} empreendimento={emp} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmpreendimentoLinha({ empreendimento }: { empreendimento: Empreendimento }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-gray-900">
          {empreendimento.nome}
        </span>
        {empreendimento.endereco && (
          <span className="hidden sm:inline text-xs text-gray-500 truncate">
            · {empreendimento.endereco}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {empreendimento.vagas} vaga{empreendimento.vagas !== 1 ? 's' : ''}
        </span>
        {!empreendimento.ativo && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
            Inativo
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/dashboard/empreendimentos/novo?id=${empreendimento.id}`}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Editar
        </Link>
        <FormAlternarAtivo
          id={empreendimento.id}
          ativo={empreendimento.ativo}
        />
      </div>
    </div>
  )
}