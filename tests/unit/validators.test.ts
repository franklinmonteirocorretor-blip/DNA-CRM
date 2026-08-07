import { describe, expect, it } from 'vitest'
import { cpfValido, emailValido } from '@/src/lib/validators'

describe('cpfValido', () => {
  it('aceita CPFs válidos', () => {
    expect(cpfValido('52998224725')).toBe(true)
    expect(cpfValido('11144477735')).toBe(true)
    expect(cpfValido('39053344705')).toBe(true)
  })

  it('rejeita CPFs inválidos', () => {
    expect(cpfValido('52998224726')).toBe(false)
    expect(cpfValido('12345678900')).toBe(false)
  })

  it('rejeita dígitos repetidos', () => {
    expect(cpfValido('11111111111')).toBe(false)
    expect(cpfValido('00000000000')).toBe(false)
  })

  it('rejeita tamanho errado e não-numérico', () => {
    expect(cpfValido('123')).toBe(false)
    expect(cpfValido('')).toBe(false)
    expect(cpfValido('abcdefghijk')).toBe(false)
  })
})

describe('emailValido', () => {
  it('aceita e-mails válidos', () => {
    expect(emailValido('a@b.com')).toBe(true)
    expect(emailValido('cliente@exemplo.com.br')).toBe(true)
  })

  it('rejeita e-mails inválidos', () => {
    expect(emailValido('invalido')).toBe(false)
    expect(emailValido('a@b')).toBe(false)
    expect(emailValido('@semusuario.com')).toBe(false)
  })

  it('aceita campo vazio (opcional)', () => {
    expect(emailValido(null)).toBe(true)
    expect(emailValido(undefined)).toBe(true)
    expect(emailValido('')).toBe(true)
  })
})
