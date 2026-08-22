# Sprint B.1 — WhatsApp Runtime

## Estado de segurança

- Outbound real permanece desligado por `WHATSAPP_REAL_OUTBOUND_ENABLED=false`.
- QR existe apenas na memória do gateway e expira em 55 segundos.
- Credenciais e Signal keys são persistidas em `whatsapp_auth_state` com AES-256-GCM.
- `WHATSAPP_GATEWAY_SECRET`, `WHATSAPP_AUTH_ENCRYPTION_KEY` e `SUPABASE_SECRET_KEY` nunca usam prefixo `NEXT_PUBLIC_`.
- Logs registram eventos operacionais; não registram QR, tokens, mensagens ou auth state.

## Render

Criar serviço pelo `render.yaml`. Auto-deploy fica desligado. Configurar manualmente:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` moderna e rotacionada
- `WHATSAPP_GATEWAY_SECRET`: aleatório, mínimo 48 bytes
- `WHATSAPP_AUTH_ENCRYPTION_KEY`: exatamente 32 bytes em base64
- `CRM_INBOUND_URL`: `https://monteiro-crm.vercel.app/api/agent/whatsapp/inbound`
- `WHATSAPP_AUTHORIZED_TEST_NUMBERS`: somente números de teste, separados por vírgula

Configurar no Vercel, somente no servidor:

- `WHATSAPP_GATEWAY_URL`
- `WHATSAPP_GATEWAY_SECRET`: mesmo valor do Render

## Gates reais

1. Gateway local e conta de teste.
2. Render e conta de teste.
3. Reinício e restauração da sessão.
4. Perda de rede e reconnect.
5. Logout/invalidação e novo QR.
6. Inbound DM persistido.
7. Outbound somente para número autorizado; requer liberação deliberada posterior.
8. Áudio/documento recebido como stub.
9. Human Takeover bloqueia resposta automática; inbound continua.
10. Soak mínimo 24 horas sem falha de health ou perda de sessão.

Número comercial continua proibido até todos os gates passarem.
