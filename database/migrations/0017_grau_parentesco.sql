-- ============================================================================
-- DNA CRM — Migração 0014: grau de parentesco do dependente (Franklin 10/07)
-- ============================================================================

alter table documentos add column if not exists grau_parentesco text;
