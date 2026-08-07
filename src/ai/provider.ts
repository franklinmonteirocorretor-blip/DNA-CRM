// ─── Sprint 16 — Copiloto IA DNA Imóveis ────────────────────────────────────────
// AI Provider Layer: Abstract Factory Pattern.
// Suporte: OpenAI, Claude, Gemini, DeepSeek, OpenRouter, Ollama.
// FASE 1: apenas MockProvider. FASE 2: providers reais com HTTP calls.

import type {
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIChatMessage,
} from '@/src/types/copiloto'

// ─── Factory ───────────────────────────────────────────────────────────────────

export function criarAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.tipo) {
    case 'mock':
      return criarMockProvider()
    case 'openai':
    case 'claude':
    case 'gemini':
    case 'deepseek':
    case 'openrouter':
    case 'ollama':
      throw new Error(`Provider "${config.tipo}" ainda não implementado (FASE 2)`)
    default:
      throw new Error(`Provider desconhecido: ${config.tipo}`)
  }
}

// ─── Mock Provider ─────────────────────────────────────────────────────────────

function criarMockProvider(): AIProvider {
  return {
    config: {
      tipo: 'mock',
      apiKey: 'mock-key',
      model: 'mock-model',
      temperature: 0.3,
      maxTokens: 2000,
    },
    nome: 'DNA Copilot (Mock)',

    async completar(prompt: AICompletionRequest): Promise<AICompletionResponse> {
      // Extrai o último prompt do usuário para gerar resposta contextual
      const userMessage = prompt.messages.filter(m => m.role === 'user').pop()
      const query = userMessage?.content ?? ''

      return {
        ok: true,
        content: `[MOCK] ${query}`,
        usage: {
          promptTokens: Math.ceil(query.length / 4),
          completionTokens: 42,
        },
      }
    },
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function buildSystemPrompt(contexto: string, instrucoes: string[]): AIChatMessage {
  const instrucoesStr = instrucoes.map(i => `- ${i}`).join('\n')
  return {
    role: 'system',
    content: `Você é o Copiloto IA do DNA Imóveis, um assistente comercial inteligente.
Seu papel é ajudar corretores e gerentes a tomar as melhores decisões com base em dados reais do CRM.

DATOS DO CRM:
${contexto}

INSTRUÇÕES:
${instrucoesStr}

IMPORTANTE:
- Responda sempre em português brasileiro.
- Seja direto e acionável.
- Baseie-se APENAS nos dados fornecidos acima.
- NUNCA invente números, nomes ou informações.
- Se não souber, diga "Não tenho dados suficientes para responder isso."
- Sugira ações concretas que o corretor possa executar agora.`,
  }
}

export function buildUserMessage(pergunta: string): AIChatMessage {
  return { role: 'user', content: pergunta }
}

export async function completarComProvider(
  provider: AIProvider,
  system: string,
  user: string,
): Promise<string> {
  const response = await provider.completar({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  })

  if (!response.ok) {
    throw new Error(response.erro ?? 'Erro desconhecido no provider')
  }

  return response.content
}