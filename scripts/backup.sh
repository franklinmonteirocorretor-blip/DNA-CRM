#!/bin/bash
# DNA CRM v2 — Database Backup Script
# Uso: ./scripts/backup.sh
# Requer: pg_dump (PostgreSQL client) + SUPABASE_SERVICE_ROLE_KEY
#
# Faz dump do schema + dados do Supabase via CLI

set -eo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="database/backups"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
mkdir -p "$BACKUP_DIR"

echo "[*] Iniciando backup do Supabase..."
echo "[*] Timestamp: $TIMESTAMP"

# Usa supabase CLI se disponivel, senão usa pg_dump direto
if command -v supabase &> /dev/null; then
  supabase db dump -f "$BACKUP_FILE"
  echo "[✓] Backup salvo: $BACKUP_FILE"
else
  echo "[!] Supabase CLI não instalada. Tentando pg_dump..."
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
  DB_HOST=$(echo "$SUPABASE_URL" | sed -E 's|https?://([^.]+).*|\1|')
  # Credencial via ambiente — nunca hardcoded (ver .env.local)
  : "${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD no ambiente para pg_dump}"
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "db.${DB_HOST}.supabase.co" \
    -U postgres \
    -d postgres \
    --no-owner --no-acl \
    -f "$BACKUP_FILE"
  
  echo "[✓] Backup completado via pg_dump: $BACKUP_FILE"
fi

echo "=== Backup finalizado ==="