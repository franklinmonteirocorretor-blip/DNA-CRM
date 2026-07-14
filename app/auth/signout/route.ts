import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

// POST /auth/signout — faz logout e redireciona para /login
export async function POST() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), {
    status: 303,
  })
}