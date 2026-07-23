import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { painelDocumentos } from './actions'
import PainelDocumentos from '@/src/components/documentos/PainelDocumentos'

export const dynamic = 'force-dynamic'

export default async function DocumentosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Autenticação necessária.</p></div>

  const dados = await painelDocumentos()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central de Documentos</h1>
        <p className="mt-1 text-sm text-gray-500">Controle documental integrado ao Pipeline.</p>
      </div>
      <PainelDocumentos dados={dados} />
    </div>
  )
}