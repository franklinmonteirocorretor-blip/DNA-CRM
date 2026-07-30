'use client'

// DNA CRM — RC2: Componente de erro reutilizável
// Usado tanto em error.tsx quanto em catch boundaries manuais.

import { useEffect } from 'react'

export interface ErrorStateProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Rota base para o link "Voltar" (default: /dashboard) */
  homeHref?: string
  /** Mensagem customizada opcional (usa error.message por default) */
  message?: string
}

export default function ErrorState({
  error,
  reset,
  homeHref = '/dashboard',
  message,
}: ErrorStateProps) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">&#x26A0;&#xFE0F;</div>
        <h2 className="text-xl font-bold text-gray-900">Algo deu errado</h2>
        <p className="text-sm text-gray-500">
          {message || error.message || 'Um erro inesperado ocorreu ao carregar esta página.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Tentar novamente
          </button>
          <a
            href={homeHref}
            className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  )
}