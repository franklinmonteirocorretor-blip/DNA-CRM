import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          DNA CRM
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Sistema de gestão imobiliária — controle seu funil de vendas,
          acompanhe leads e aumente suas conversões.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Entrar no sistema
          </Link>
          <Link
            href="/test-supabase"
            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            Testar conexão
          </Link>
        </div>
      </div>
    </div>
  )
}