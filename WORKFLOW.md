# AI-HUB — Workflow de Desenvolvimento

**Versão:** 2.1 (Geral)  
**Data:** 13/07/2026  
**Mente Principal:** OpenCode + DeepSeek V4 PRO (via NVIDIA API)  
**Executor Principal:** OpenCode  
**Suporte / Revisão:** Claude Desktop e Grok 4.5 (quando necessário)

---

## Propósito deste Workflow

Este documento define como usar o **DeepSeek V4 PRO** como **Mente Principal** do AI-HUB para desenvolvimento de projetos (atualmente o DNA CRM, mas projetado para ser usado em múltiplos projetos futuros).

---

## Estrutura de IAs

| Papel                    | Modelo                          | Quando usar |
|--------------------------|----------------------------------|-----------|
| **Mente Principal**      | **DeepSeek V4 PRO**             | Planejamento, arquitetura, decisões estratégicas, raciocínio complexo |
| **Executor de Código**   | OpenCode + DeepSeek V4 PRO      | Escrever código, criar arquivos, implementar funcionalidades |
| **Revisão Avançada**     | Claude Desktop                  | Refatoração grande, arquitetura complexa, revisão de qualidade |
| **Segunda Opinião**      | Grok 4.5                        | Quando precisar de uma visão diferente ou complementar |
| **Tarefas Leves / Rápidas** | Modelos locais (Qwen2.5-Coder, etc) | Ajustes pequenos, debug rápido, tarefas simples |

---

## Regras de Ouro

1. **DeepSeek V4 PRO** é a mente principal para quase tudo.
2. Sempre comece com planejamento e arquitetura no DeepSeek V4 PRO antes de pedir código.
3. Use o **OpenCode** como ferramenta principal de execução.
4. Use **Claude** quando o DeepSeek entregar algo que precise de revisão profunda.
5. Use **Grok 4.5** apenas quando quiser uma segunda opinião diferente.
6. Mantenha histórico/contexto rico, especialmente com a Mente Principal.
7. Este workflow serve para **qualquer projeto**, não apenas o DNA CRM.

---

## Fluxo Recomendado por Tipo de Tarefa

| Tipo de Tarefa                    | Fluxo Recomendado |
|----------------------------------|-------------------|
| Novo projeto / Módulo grande     | DeepSeek V4 PRO → Planejamento → OpenCode → Execução |
| Implementação de funcionalidade  | DeepSeek V4 PRO → OpenCode |
| Refatoração / Melhoria de código | DeepSeek V4 PRO → Claude (revisão) |
| Debug / Correção rápida          | DeepSeek V4 PRO |
| Arquitetura / Decisões importantes | DeepSeek V4 PRO |
| Tarefas simples                  | OpenCode + modelo local |

---

## Como Usar com a Mente Principal (DeepSeek V4 PRO)

Sempre que for iniciar algo importante, forneça:

- Contexto do projeto
- Objetivo claro
- Restrições ou preferências
- Arquivos relevantes (se possível)

Exemplo de prompt inicial:
> "Você é a mente principal do meu AI-HUB. Vamos trabalhar no projeto X. Aqui está o contexto: [contexto]. Quero que faça o planejamento/arquitetura de [tarefa]."

---

## Projetos Atuais e Futuros

- **Projeto atual:** DNA CRM (foco principal no momento)
- **Projetos futuros:** Serão adicionados aqui conforme forem surgindo

Este workflow foi feito para ser reutilizado em qualquer projeto que você for desenvolver.

---

*Documento geral do AI-HUB - Mente Principal: DeepSeek V4 PRO*
