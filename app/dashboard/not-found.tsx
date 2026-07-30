// DNA CRM — RC1 — Not Found base para /app/dashboard

import Link from 'next/link'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-8xl">🔍</div>
        <h2 className="text-xl font-bold text-gray-900">Página não encontrada</h2>
        <p className="text-sm text-gray-500">
          O recurso que você procura não existe ou foi removido.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}