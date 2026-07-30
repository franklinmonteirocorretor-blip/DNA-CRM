import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { NextResponse } from 'next/server'
import { getSiteUrl } from '@/src/utils/url'

// POST /auth/signout — faz logout e redireciona para /login
export async function POST() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/login', getSiteUrl()), {
    status: 303,
  })
}