# Sprint B — decisão do provider WhatsApp

Escolha: `@whiskeysockets/baileys@7.0.0-rc14`, isolado atrás de `WhatsAppProvider`.

## Comparação

| Critério | Baileys | whatsapp-web.js | WPPConnect |
|---|---|---|---|
| Multi-device/QR | Sim | Sim | Sim |
| Processo | WebSocket | Chromium/Puppeteer | Chromium/Puppeteer |
| Tipagem | TypeScript | JS + tipos | TypeScript |
| Inbound/outbound/ack/mídia | Sim | Sim | Sim |
| Custo de memória | Menor | Alto | Alto |
| Sessão persistente | Adapter próprio | Estratégias de auth | Multi-session |

Baileys foi escolhido por não depender de navegador e por encaixar melhor num worker Node isolado. A versão é release candidate e pode introduzir quebra; por isso o domínio não importa tipos concretos da biblioteca.

## Limitação operacional

Linked Device é integração não oficial e pode quebrar quando o WhatsApp muda. O socket precisa de processo durável; ele não deve rodar em função serverless da Vercel. A Vercel hospeda CRM/API e um worker externo durável hospeda Baileys. Outbound real permanece bloqueado; `Simulation Mode` é o padrão até worker, segredo, sessão e testes de gate estarem aprovados.
