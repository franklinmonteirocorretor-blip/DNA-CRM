# Sprint B.2 — provisionamento e validação controlada

Atualizado em: 22/08/2026

Status: **NO-GO para número comercial**.

## Segurança

- Aplicação usa `SUPABASE_SECRET_KEY` moderna somente no servidor.
- JWT legado não foi encontrado no worktree nem nos 10 commits recentes auditados.
- `WHATSAPP_GATEWAY_SECRET` e `WHATSAPP_AUTH_ENCRYPTION_KEY` aparecem apenas como nomes de variáveis em código e documentação.
- Valores reais permanecem em ambientes protegidos e `.env.local` ignorado.
- Simulation Mode está ativo.
- Outbound real geral está desativado.
- Allowlist local está vazia.

## Runtime validado

- Render foi suspenso manualmente antes do primeiro start saudável no Back4App; após o corte, o endpoint antigo respondeu HTTP 503.
- Back4App Free implantou o commit `af17f91` da branch `sprint-b2-whatsapp-gateway` usando `apps/whatsapp-gateway/Dockerfile` e porta 10000.
- O deploy Back4App `a6fd08cc-b7c9-418a-bfd7-604aa57eb0d0` ficou `Ready`; `/health` respondeu HTTP 200 com `ok: true`, `outboundReal: false`, `startupError` nulo e RSS de aproximadamente 110 MB em uma instância de 256 MB.
- A restauração encontrou exatamente uma sessão local `connected`, circuito fechado, zero tentativas de reconnect e nenhum último erro, sem exigir novo QR.
- Requisição com segredo incorreto em rota protegida recebeu HTTP 401.
- O CRM Vercel foi reimplantado em produção depois da validação do novo runtime, com `WHATSAPP_GATEWAY_URL` atualizado e segredo preservado no ambiente protegido.
- Sessão de teste está `connected`.
- Logout da sessão antiga e conexão limpa da nova sessão `dde0e967-d932-484d-ac71-827f41d49448` por novo QR foram comprovados em 22/08/2026.
- Novo auth state persistiu 945 registros criptografados no Supabase; heartbeat ficou ativo, reconnect zerado, circuito fechado e `failure_reason` nulo.
- Heartbeat e última atividade foram observados em 22/08/2026.
- Circuit breaker está `closed`, sem tentativas de reconnect pendentes.
- Restart e restauração sem novo QR foram validados anteriormente com a conta de teste.
- Disconnect e reconnect controlados foram repetidos em 22/08/2026: `connected → disconnected → reconnecting → connected`, com circuito fechado e zero falhas acumuladas ao final.
- Auth state e Signal keys permanecem persistidos no Supabase.
- Inbound real de texto, áudio, documento e vídeo foi observado.
- Imagem JPEG inbound real foi observada em 22/08/2026; objeto de 124.566 bytes existe no bucket privado `whatsapp-media`, com `storagePath` persistido e `storageError` nulo.
- A imagem ficou vinculada a cliente e conversa, gerou `MESSAGE_RECEIVED` e auditoria `process_provider_message/persisted`; a consulta por `providerMessageId` retornou exatamente uma mensagem.
- Mídias verificadas possuem MIME e `storagePath`, sem `storageError`.
- `providerMessageId`, `providerConversationId`, vínculo com conversa e cliente foram observados.
- Replay do mesmo `providerMessageId` manteve um registro lógico.
- Falha controlada de Storage foi simulada com envelope de imagem: a mensagem lógica, `agent_event` e `agent_audit_log` sobreviveram com `storagePath` nulo e erro de mídia registrado.
- Replay desse envelope manteve exatamente uma mensagem, um evento e uma auditoria.
- Human Takeover e retorno para `AUTO` foram observados.
- Eventos e auditorias de inbound, bloqueio, aprovação humana e takeover foram persistidos.

## Baseline de 22/08/2026

- CRM lint: aprovado.
- CRM TypeScript: aprovado.
- CRM testes: 10/10 aprovados.
- CRM build: aprovado, 44 rotas.
- Gateway build: aprovado.
- Gateway testes: 3/3 aprovados.
- Gateway audit: zero vulnerabilidades.
- CRM audit: duas vulnerabilidades moderadas transitivas em `uuid`, via `exceljs`; correção automática disponível apenas com downgrade incompatível.

## Migrations

- Estruturas remotas das migrations de jornada, CCA, cidade, cancelamento, agente, WhatsApp, mídia e bases foram observadas.
- RPCs `transition_client_journey` e `update_client_base` existem no banco remoto.
- Bucket privado `whatsapp-media` existe, com limite de 25 MB e MIME permitido para áudio, PDF, imagem, vídeo e fallback binário.
- Ledger exato da CLI não foi comparado: checkout não está vinculado ao Supabase CLI e não possui `SUPABASE_ACCESS_TOKEN` ou senha direta do Postgres.
- Nenhuma migration foi reaplicada ou alterada retroativamente nesta consolidação.

## Gates pendentes

1. Perda física de rede com backoff observado; disconnect/reconnect lógico já passou.
2. Outbound allowlisted único com ACK, read-back, retry e idempotência física.
3. Cobertura automatizada de integração para lifecycle, takeover, Storage e outbound; Policy Engine, idempotência e backoff possuem cobertura unitária mínima.
4. Runtime com URL permanente e sem sleep.
5. Soak contínuo mínimo de 24 horas.

## Gates concluídos

1. Logout/invalidação da sessão antiga, novo QR e reconexão limpa em nova sessão, com auth state novo e leitura canônica no Supabase.
2. Imagem inbound real com persistência no Storage, vínculo canônico, evento, auditoria e unicidade por `providerMessageId`.

## Bloqueio estrutural

Render Free foi retirado do caminho ativo porque pode suspender o processo por inatividade. O Back4App Free executou corretamente o container, mas o painel marcou o domínio gerado como temporário e válido por apenas 60 minutos. Enquanto não houver URL permanente e continuidade comprovada, não existe soak válido. Número comercial permanece proibido.

## Runtime durável: decisão de infraestrutura

| Opção | Custo mínimo observado | Adequação ao socket Baileys |
| --- | ---: | --- |
| Render Free | R$ 0 | Inadequado para produção: dorme após 15 minutos sem tráfego inbound e pode reiniciar a qualquer momento. |
| Railway Free | R$ 0 com recurso limitado | Serve para experimento, não oferece a garantia operacional exigida; após o período inicial, o recurso gratuito informado é limitado. |
| Railway Hobby | US$ 5/mês de uso mínimo | Adequado para validação contínua de baixo tráfego, com alvo de disponibilidade publicado. |
| Fly.io shared CPU | aproximadamente US$ 2,02/mês com 256 MB, ou US$ 3,32/mês com 512 MB | Candidato de menor custo para processo sempre iniciado; exige cartão e controle de consumo. |
| VPS pequeno | variável | Melhor controle operacional, mas transfere atualização, firewall, monitoramento e recuperação ao operador. |

Fontes oficiais consultadas em 22/08/2026: [Render Free](https://render.com/docs/free), [Railway Pricing](https://railway.com/pricing) e [Fly.io Resource Pricing](https://fly.io/docs/about/pricing/).

Recomendação: concluir os gates destrutivos na conta teste e mover o gateway para um runtime pago mínimo antes do soak. Pings artificiais no Render Free não transformam o plano em runtime durável e não serão usados como prova de produção.

### Experimento Back4App Free de 22/08/2026

- Portabilidade do container: aprovada.
- Build Docker e startup: aprovados.
- Restauração do auth state e socket sem QR: aprovada.
- Segurança de corte: aprovada; Render foi suspenso antes do Back4App restaurar a sessão.
- Outbound geral: permaneceu desligado.
- Limite de memória: aprovado no instante observado, com cerca de 110 MB de RSS para 256 MB disponíveis.
- Runtime durável: não aprovado, porque a URL gratuita foi apresentada como temporária por 60 minutos.
- Soak de 24 horas: não iniciado; a URL temporária invalida o pré-requisito.

## Decisão

Sprint B.2 ainda não está fechada. Código, container e conta de teste funcionam, e o corte Render → Back4App foi validado sem QR e sem dois sockets. Porém a URL gratuita temporária não oferece runtime contínuo; soak e gates destrutivos/controlados permanecem pendentes. **NO-GO técnico para número comercial.**
