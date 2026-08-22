# Back4App Free — perfil de deploy

Este perfil executa o mesmo container do Monteiro WhatsApp Gateway. Não existe código de domínio específico para Back4App.

## Configuração

- Repositório: `DNA-CRM`
- Branch: `master`
- Root directory: `apps/whatsapp-gateway`
- Dockerfile: `Dockerfile`
- Health check: `/health`
- Plano: Free, 0.25 CPU, 256 MB RAM, região USA
- Auto deploy: desativado durante a Sprint B.2

Configure somente no painel, nunca no Git:

```text
NODE_ENV=production
PORT=<porta fornecida pelo runtime>
NODE_OPTIONS=--max-old-space-size=160
SUPABASE_URL=<secret>
SUPABASE_SECRET_KEY=<secret>
WHATSAPP_GATEWAY_SECRET=<secret>
WHATSAPP_AUTH_ENCRYPTION_KEY=<secret>
CRM_INBOUND_URL=https://monteiro-crm.vercel.app/api/agent/whatsapp/inbound
WHATSAPP_AUTHORIZED_TEST_NUMBERS=<somente números de teste>
WHATSAPP_REAL_OUTBOUND_ENABLED=false
WHATSAPP_MEDIA_BUCKET=whatsapp-media
WHATSAPP_CIRCUIT_COOLDOWN_MS=300000
```

O container não usa disco persistente. Auth state, Signal keys, mensagens e mídia permanecem no Supabase.

## Validação mínima

1. Confirmar build `READY` e container `AVAILABLE`.
2. Confirmar `GET /health` com `ok: true`, memória abaixo de 256 MB e outbound `false`.
3. Confirmar segredo incorreto com HTTP 401.
4. Parar Render antes de iniciar restauração no Back4App.
5. Confirmar restauração da sessão de teste sem QR.
6. Atualizar `WHATSAPP_GATEWAY_URL` na Vercel somente após health e restore passarem.

Nunca mantenha Render e Back4App ativos na mesma sessão.
