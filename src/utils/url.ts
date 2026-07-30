// DNA CRM — RC2: Helper centralizado para URL base do site
// Substitui hardcoded 'http://localhost:3000' nos arquivos de auth

export function getSiteUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL or VERCEL_URL must be set in production')
  }
  return 'http://localhost:3000'
}