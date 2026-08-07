#!/bin/bash
# DNA CRM v2 — Rollback script
# Restaura a migration mais recente via Supabase CLI
#
# Uso: ./scripts/rollback.sh [backup_file.sql]
# Se nenhum arquivo for passado, usa o ultimo backup em database/backups/

set -eo pipefail

BACKUP_DIR="database/backups"

if [ $# -gt 0 ]; then
  BACKUP_FILE="$1"
else
  BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "[!] Nenhum backup encontrado em $BACKUP_DIR"
  echo "    Use: ./scripts/rollback.sh <arquivo.sql>"
  exit 1
fi

echo "=== Rollback com $BACKUP_FILE ==="

if command -v supabase &> /dev/null; then
  supabase db restore "$BACKUP_FILE"
  echo "[✓] Rollback concluido via supabase CLI"
else
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
  DB_HOST=$(echo "$SUPABASE_URL" | sed -E 's|https?://([^.]+).*|\1|')
  # Credencial via ambiente — nunca hardcoded (ver .env.local)
  : "${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD no ambiente para psql}"
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "db.${DB_HOST}.supabase.co" \
    -U postgres \
    -d postgres \
    -f "$BACKUP_FILE"
  
  echo "[✓] Rollback concluido via psql"
fi

echo "[✓] Rollback finalizado"