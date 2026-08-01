'use server'

import { requireAuth } from '@/src/lib/auth/guards'
import { createSupabaseServerClient } from '@/src/lib/server/supabase'
import { redirect } from 'next/navigation'
import { dispatchAutomation } from '@/src/lib/automation/engine'

// Action do Servidor — executada quando o formulário de novo cliente é enviado.
// O Next.js chama esta função com os dados do FormData automaticamente.
export async function cadastrarCliente(formData: FormData) {
  const usuario = await requireAuth()

  const supabase = await createSupabaseServerClient()

  // 2. Extrai os campos do formulário
  const nome = formData.get('nome') as string
  const cpf = (formData.get('cpf') as string).replace(/\D/g, '') // remove . e -
  const telefone = (formData.get('telefone') as string).replace(/\D/g, '')
  const email = (formData.get('email') as string) || null
  const rendaStr = formData.get('renda') as string
  const dependentesStr = formData.get('dependentes') as string
  const empreendimento = (formData.get('empreendimento_id') as string) || null
  const observacoes = (formData.get('observacoes') as string) || null

  // 3. Validação básica
  const erros: string[] = []

  if (!nome || nome.trim().length < 3) {
    erros.push('Nome deve ter pelo menos 3 caracteres.')
  }

  if (!cpf || cpf.length !== 11) {
    erros.push('CPF deve ter exatamente 11 dígitos.')
  }

  if (!telefone || (telefone.length !== 11 && telefone.length !== 10)) {
    erros.push('Telefone deve ter 10 ou 11 dígitos (com DDD).')
  }

  if (erros.length > 0) {
    // Retorna os erros como string (o formulário vai exibi-los)
    return { erros }
  }

  // 4. Insere no banco
  const renda = rendaStr ? parseFloat(rendaStr) : null
  const dependentes = dependentesStr ? parseInt(dependentesStr) : 0

  const { error, data: clienteCriado } = await supabase.from('clientes').insert({
    nome: nome.trim(),
    cpf,
    telefone,
    email,
    renda: renda && renda >= 0 ? renda : null,
    dependentes: dependentes >= 0 ? dependentes : 0,
    empreendimento_id: empreendimento || null,
    observacoes: observacoes?.trim() || null,
    corretor_responsavel_id: usuario.id,
  }).select('id').single()

  if (error) {
    return { erros: [error.message] }
  }

  const novoClienteId = clienteCriado?.id

  dispatchAutomation('cliente_criado', 'cliente', novoClienteId ?? '', {
    nome: nome.trim(),
    cpf,
    telefone,
    email,
    corretor_id: usuario.id,
    empreendimento_id: empreendimento || null,
  })

  // 5. Sucesso → redireciona para a lista de clientes
  redirect('/dashboard/clientes')
}