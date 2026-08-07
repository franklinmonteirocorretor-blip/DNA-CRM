// ─── Validadores compartilhados (DNA CRM) ─────────────────────────────────────

/** Valida CPF: 11 dígitos + dígitos verificadores (algoritmo oficial) */
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcularDigito = (tamanho: number): number => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(cpf[i], 10) * (tamanho + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return (
    calcularDigito(9) === parseInt(cpf[9], 10) &&
    calcularDigito(10) === parseInt(cpf[10], 10)
  )
}

/** Valida e-mail simples. Retorna true para campo vazio (opcional) */
export function emailValido(email: string | null | undefined): boolean {
  if (!email || !email.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
