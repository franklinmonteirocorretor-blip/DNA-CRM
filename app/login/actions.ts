'use server'

import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { redirect } from 'next/navigation'
import { getSiteUrl } from '@/src/utils/url'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres' }
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Conta criada! Verifique seu e-mail para confirmar o cadastro.' }
}