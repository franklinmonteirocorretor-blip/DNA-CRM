// ─── SQL Utils === escape especial para LIKE ─────────────────────────────
// Escapa wildcards % e _ que são especiais no SQL LIKE/ILIKE
// Garantia contra ataques de mass-reveal via ilike com user-input

/** Escapa % e _ para uso seguro em cláusulas SQL LIKE/ILIKE */
export function escaparLike(valor: string): string {
  return valor.replace(/%/g, '\\%').replace(/_/g, '\\_')
}