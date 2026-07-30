// DNA CRM — RC1 — Login loading skeleton

export default function LoginLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-600">
      <div className="text-center space-y-4">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
        <p className="text-white text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}