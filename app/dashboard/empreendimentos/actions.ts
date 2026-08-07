'use server'

import { requirePermission } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function criarEmpreendimento(formData: FormData) {
  await requirePermission('empreendimentos', 'criar')

  const supabase = await createSupabaseServerClient()

  const nome = (formData.get('nome') as string).trim()
  const endereco = (formData.get('endereco') as string)?.trim() || null
  const vagasStr = (formData.get('vagas') as string) || '0'

  const erros: string[] = []

  if (!nome || nome.length < 2) {
    erros.push('Nome do empreendimento deve ter pelo menos 2 caracteres.')
  }

  const vagas = parseInt(vagasStr) || 0
  if (vagas < 0 || vagas > 9999) {
    erros.push('Número de vagas deve estar entre 0 e 9999.')
  }

  if (erros.length > 0) {
    return { erros }
  }

  const { error } = await supabase.from('empreendimentos').insert({
    nome,
    endereco,
    vagas,
    ativo: true,
  })

  if (error) {
    return { erros: [error.message] }
  }

  revalidatePath('/dashboard/empreendimentos')
  redirect('/dashboard/empreendimentos')
}

export async function editarEmpreendimento(id: string, formData: FormData) {
  await requirePermission('empreendimentos', 'editar')

  const supabase = await createSupabaseServerClient()

  const nome = (formData.get('nome') as string).trim()
  const endereco = (formData.get('endereco') as string)?.trim() || null
  const vagasStr = (formData.get('vagas') as string) || '0'
  const ativo = formData.get('ativo') === 'true'

  const erros: string[] = []

  if (!nome || nome.length < 2) {
    erros.push('Nome do empreendimento deve ter pelo menos 2 caracteres.')
  }

  const vagas = parseInt(vagasStr) || 0
  if (vagas < 0 || vagas > 9999) {
    erros.push('Número de vagas deve estar entre 0 e 9999.')
  }

  if (erros.length > 0) {
    return { erros }
  }

  const { error } = await supabase
    .from('empreendimentos')
    .update({ nome, endereco, vagas, ativo })
    .eq('id', id)

  if (error) {
    return { erros: [error.message] }
  }

  revalidatePath('/dashboard/empreendimentos')
  redirect('/dashboard/empreendimentos')
}

export async function alternarAtivoEmpreendimento(id: string, ativo: boolean) {
  await requirePermission('empreendimentos', 'editar')

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('empreendimentos')
    .update({ ativo })
    .eq('id', id)

  if (error) {
    return { erro: error.message }
  }

  revalidatePath('/dashboard/empreendimentos')
  return { sucesso: true }
}