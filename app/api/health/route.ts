import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  // 1. Supabase connectivity
  let dbOk = false
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('usuarios').select('id', { count: 'exact', head: true })
    dbOk = !error
  } catch {
    dbOk = false
  }

  const allOk = dbOk

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}