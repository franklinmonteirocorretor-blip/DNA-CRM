// DNA CRM — RC1: Safe query wrapper que propaga erros do Supabase para o error boundary
// Evita que queries silenciosamente retornem `data` null/empty quando há erro de servidor ou permissão.

type SupabaseQueryResult<T> = {
  data: T | null
  error: Error | null
}

/**
 * Executa a query Supabase e rejeita se houver erro.
 * Funciona para queries retornando array `T[]` ou objeto `T`.
 *
 * ATENÇÃO: Não use com `.single()` — use `throwOnErrorMaybeSingle()` para essas queries.
 */
export async function throwOnError<T>(
  promise: PromiseLike<SupabaseQueryResult<T>>
): Promise<T> {
  const { data, error } = await promise

  if (error) {
    const msg = 'message' in error ? error.message : String(error)
    throw new Error(`[Supabase] ${msg}`, { cause: error })
  }

  // data nunca é null para .select() padrão (retorna [] em vez de null)
  return data as T
}

/**
 * Para queries .single() ou .maybeSingle() que podem retornar null sem erro.
 * Lança exceção se houver erro do Supabase, mas retorna null sem erro se não encontrou.
 */
export async function throwOnSingle<T>(
  promise: PromiseLike<SupabaseQueryResult<T>>
): Promise<T | null> {
  const { data, error } = await promise

  if (error) {
    const msg = 'message' in error ? error.message : String(error)
    throw new Error(`[Supabase] ${msg}`, { cause: error })
  }

  return data ?? null
}

/**
 * Versão que retorna array vazio quando data é null (sem erro).
 * Se houver erro, throw (propaga para error boundary).
 */
export async function toArray<T>(
  promise: Promise<SupabaseQueryResult<T[]>>
): Promise<T[]> {
  const { data, error } = await promise

  if (error) {
    const msg = 'message' in error ? error.message : String(error)
    throw new Error(msg, { cause: error })
  }

  return data ?? []
}

/**
 * Helper para verificar auth e relançar se falhar.
 */
export async function getUserOrThrow(
  supabase: { auth: { getUser: () => Promise<{ data: { user: unknown } | null; error: Error | null }> } }
) {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    throw new Error('Usuario nao autenticado')
  }

  return data.user
}