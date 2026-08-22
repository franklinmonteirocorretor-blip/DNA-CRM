import test from "node:test";
import assert from "node:assert/strict";
import {
  GroqLLMProvider,
  GroqProviderError,
  type GroqTelemetryEvent,
} from "../lib/agent/brain/groq-llm-provider.ts";
import {
  GroqSpeechToTextError,
  GroqSpeechToTextProvider,
} from "../lib/agent/brain/groq-speech-to-text-provider.ts";
import { LLMProviderRegistry } from "../lib/agent/brain/provider-registry.ts";
import type { AgentContext, AgentDecision } from "../lib/agent/brain/types.ts";

const API_KEY_REF = "AGENT_LLM_API_KEY_GROQ_TEST";

const validDecision: AgentDecision = {
  intents: [{ type: "FINANCING_REQUEST", confidence: 0.98 }],
  extractedFacts: [
    { key: "monthly_income", value: 3200, knowledgeType: "FACT", confidence: 0.99 },
  ],
  strategy: "FINANCIAL_ALIGNMENT",
  nextBestAction: "EXPLAIN_PRE_ANALYSIS",
  proposedMessage: "Os valores reais dependem da pre-analise.",
  confidence: 0.96,
  requiresHuman: false,
  rationaleCode: "FINANCIAL_VALUES_REQUIRE_ANALYSIS",
};

const sensitiveContext: AgentContext = {
  clientId: 42,
  clientName: "Maria da Silva",
  client: {
    name: "Maria da Silva",
    cpf: "123.456.789-00",
    phone: "+5586999999999",
    email: "maria@example.com",
    address: "Rua das Flores, 123",
    document_url: "https://storage.example.com/whatsapp-media/private/doc.pdf",
  },
  stage: "qualification",
  recentMessages: [{
    id: 99,
    direction: "inbound",
    body: "Sou Maria da Silva, CPF 123.456.789-00, telefone +5586999999999 e e-mail maria@example.com. Minha renda e R$ 3.200.",
  }],
  facts: [
    { key: "cpf", value: "123.456.789-00", knowledgeType: "FACT", confidence: 1, active: true },
    { key: "monthly_income", value: 3200, knowledgeType: "FACT", confidence: 1, active: true },
  ],
  allowedActions: ["EXPLAIN_PRE_ANALYSIS"],
  forbiddenActions: ["real_outbound", "invent_financial_values"],
};

function envelope(content: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
    usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
  }), { status: 200, ...init });
}

async function withEnv<T>(
  overrides: Record<string, string | undefined>,
  action: () => Promise<T> | T,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await action();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function safeEnv(extra: Record<string, string | undefined> = {}) {
  return {
    GROQ_ZDR_REQUIRED: "true",
    GROQ_ZDR_CONFIRMED: "true",
    [API_KEY_REF]: "gsk_test_only_not_real",
    AGENT_LLM_API_KEY_GROQ: "gsk_test_only_not_real",
    ...extra,
  };
}

async function expectGroqCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof GroqProviderError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectSttCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof GroqSpeechToTextError);
    assert.equal(error.code, code);
    return true;
  });
}

test("Groq bloqueia quando ZDR obrigatorio esta ausente", async () => {
  await withEnv(safeEnv({ GROQ_ZDR_REQUIRED: undefined }), async () => {
    let fetchCalls = 0;
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return envelope(validDecision);
      }) as typeof fetch,
    });
    await expectGroqCode(provider.decide(sensitiveContext), "ZDR_REQUIRED");
    assert.equal(fetchCalls, 0);
  });
});

test("Groq bloqueia quando ZDR nao esta confirmado", async () => {
  await withEnv(safeEnv({ GROQ_ZDR_CONFIRMED: undefined }), async () => {
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      fetchImpl: (async () => envelope(validDecision)) as typeof fetch,
    });
    await expectGroqCode(provider.decide(sensitiveContext), "ZDR_UNCONFIRMED");
  });
});

test("Groq bloqueia quando API key server-side esta ausente", async () => {
  await withEnv(safeEnv({ [API_KEY_REF]: undefined }), async () => {
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      fetchImpl: (async () => envelope(validDecision)) as typeof fetch,
    });
    await expectGroqCode(provider.decide(sensitiveContext), "API_KEY_MISSING");
  });
});

test("Groq valida AgentDecision estrita e minimiza PII no request", async () => {
  await withEnv(safeEnv(), async () => {
    let requestBody = "";
    const telemetry: GroqTelemetryEvent[] = [];
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      fetchImpl: (async (_input: URL | RequestInfo, init?: RequestInit) => {
        requestBody = String(init?.body || "");
        return envelope(validDecision, {
          headers: {
            "x-ratelimit-limit-requests": "30",
            "x-ratelimit-remaining-requests": "29",
            "x-ratelimit-reset-requests": "2s",
          },
        });
      }) as typeof fetch,
      onTelemetry: (event) => telemetry.push(event),
      now: () => 1_000,
    });

    const decision = await provider.decide(sensitiveContext);
    const payload = JSON.parse(requestBody) as Record<string, unknown>;

    assert.equal(decision.nextBestAction, "EXPLAIN_PRE_ANALYSIS");
    assert.equal(decision.extractedFacts[0]?.value, 3200);
    assert.equal((payload.response_format as { type?: string }).type, "json_schema");
    assert.doesNotMatch(requestBody, /Maria da Silva|123\.456\.789-00|5586999999999|maria@example\.com|Rua das Flores|storage\.example\.com|private\/doc\.pdf/);
    assert.match(requestBody, /CLIENTE|CPF_REDACTED|PHONE_REDACTED|EMAIL_REDACTED/);
    assert.equal(telemetry.length, 1);
    assert.deepEqual(telemetry[0]?.rateLimit, {
      limitRequests: 30,
      remainingRequests: 29,
      resetRequests: "2s",
      limitTokens: undefined,
      remainingTokens: undefined,
      resetTokens: undefined,
    });
    assert.equal(telemetry[0]?.inputTokens, 120);
    assert.equal(telemetry[0]?.outputTokens, 45);
    assert.deepEqual(
      Object.keys(telemetry[0] || {}).filter((key) => /prompt|content|message|transcript/i.test(key)),
      [],
    );
    assert.doesNotMatch(JSON.stringify(telemetry), /Maria|CPF_REDACTED|PHONE_REDACTED|renda/i);
  });
});

test("Groq repete uma vez apos JSON malformado", async () => {
  await withEnv(safeEnv(), async () => {
    const requests: string[] = [];
    let call = 0;
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      maxRetries: 0,
      fetchImpl: (async (_input: URL | RequestInfo, init?: RequestInit) => {
        requests.push(String(init?.body || ""));
        call += 1;
        return call === 1 ? envelope("{") : envelope(validDecision);
      }) as typeof fetch,
    });

    const decision = await provider.decide(sensitiveContext);
    assert.equal(decision.strategy, "FINANCIAL_ALIGNMENT");
    assert.equal(call, 2);
    assert.match(requests[1] || "", /Corre[cç][aã]o/);
  });
});

test("Groq repete schema invalido e falha fechado", async () => {
  await withEnv(safeEnv(), async () => {
    let calls = 0;
    const telemetry: GroqTelemetryEvent[] = [];
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      maxRetries: 0,
      fetchImpl: (async () => {
        calls += 1;
        return envelope({ ...validDecision, strategy: "ARBITRARY_ACTION" });
      }) as typeof fetch,
      onTelemetry: (event) => telemetry.push(event),
    });

    await expectGroqCode(provider.decide(sensitiveContext), "SCHEMA_INVALID");
    assert.equal(calls, 2);
    assert.equal(telemetry.length, 1);
    assert.equal(telemetry[0]?.status, "error");
    assert.equal(telemetry[0]?.schemaValid, false);
    assert.equal(telemetry[0]?.retryCount, 1);
  });
});

test("Groq limita Retry-After a 5 segundos", async () => {
  await withEnv(safeEnv(), async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      maxRetries: 1,
      fetchImpl: (async () => {
        calls += 1;
        return calls === 1
          ? new Response("rate limited", { status: 429, headers: { "retry-after": "99" } })
          : envelope(validDecision);
      }) as typeof fetch,
      sleep: async (milliseconds) => { sleeps.push(milliseconds); },
    });

    const decision = await provider.decide(sensitiveContext);
    assert.equal(decision.nextBestAction, "EXPLAIN_PRE_ANALYSIS");
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [5_000]);
  });
});

test("timeout Groq ativa fallback deterministico e deixa telemetria", async () => {
  await withEnv(safeEnv(), async () => {
    const telemetry: GroqTelemetryEvent[] = [];
    const provider = new GroqLLMProvider({
      model: "openai/gpt-oss-120b",
      apiKeyRef: API_KEY_REF,
      maxRetries: 0,
      fetchImpl: (async () => {
        throw new DOMException("timeout", "TimeoutError");
      }) as typeof fetch,
      onTelemetry: (event) => telemetry.push(event),
    });
    const registry = new LLMProviderRegistry();
    registry.register({ provider: "groq", model: "openai/gpt-oss-120b", enabled: true, priority: 1 }, provider);

    const decision = await registry.withFallback((candidate) => candidate.decide({
      ...sensitiveContext,
      recentMessages: [{ direction: "inbound", body: "Quanto vou financiar?" }],
    }));

    assert.equal(registry.getLastUsedProvider(), "deterministic-fallback");
    assert.equal(decision.nextBestAction, "EXPLAIN_PRE_ANALYSIS");
    assert.equal(telemetry[0]?.errorType, "TIMEOUT");
    assert.equal(telemetry[0]?.status, "error");
  });
});

test("Groq STT transcreve PT-BR e calcula confianca", async () => {
  await withEnv(safeEnv(), async () => {
    const originalFetch = globalThis.fetch;
    let requestBody: FormData | undefined;
    try {
      globalThis.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
        requestBody = init?.body as FormData;
        return Response.json({
          text: "Minha renda aproximada e tres mil e duzentos reais.",
          segments: [{ start: 0, end: 3, avg_logprob: -0.1, no_speech_prob: 0.05 }],
        }, {
          headers: {
            "x-ratelimit-limit-requests": "20",
            "x-ratelimit-remaining-requests": "19",
            "x-ratelimit-reset-requests": "1s",
          },
        });
      }) as typeof fetch;

      const result = await new GroqSpeechToTextProvider({ model: "whisper-large-v3", maxRetries: 0 })
        .transcribe({ mediaId: "fixture-audio", bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/ogg", language: "pt-BR" });

      assert.match(result.text, /renda aproximada/);
      assert.ok(result.confidence > 0.8 && result.confidence <= 1);
      assert.equal(requestBody?.get("model"), "whisper-large-v3");
      assert.equal(requestBody?.get("language"), "pt");
      assert.equal(requestBody?.get("response_format"), "verbose_json");
      assert.equal(result.telemetry?.retryCount, 0);
      assert.equal(result.telemetry?.rateLimit?.remainingRequests, 19);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("Groq STT reporta 429 sem retry agressivo", async () => {
  await withEnv(safeEnv(), async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => new Response("rate limited", {
        status: 429,
        headers: {
          "retry-after": "99",
          "x-ratelimit-limit-requests": "20",
          "x-ratelimit-remaining-requests": "0",
          "x-ratelimit-reset-requests": "1m",
        },
      })) as typeof fetch;
      const provider = new GroqSpeechToTextProvider({ maxRetries: 0 });
      await assert.rejects(
        provider.transcribe({ mediaId: "fixture-audio", bytes: new Uint8Array([1]), mimeType: "audio/wav" }),
        (error: unknown) => {
          assert.ok(error instanceof GroqSpeechToTextError);
          assert.equal(error.code, "GROQ_STT_RATE_LIMITED");
          assert.equal(error.status, 429);
          assert.equal(error.telemetry?.rateLimit?.remainingRequests, 0);
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("Groq STT conserva baixa confianca sem inventar", async () => {
  await withEnv(safeEnv(), async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => Response.json({
        text: "trecho incerto",
        segments: [{ start: 0, end: 2, avg_logprob: -8, no_speech_prob: 0.99 }],
      })) as typeof fetch;
      const result = await new GroqSpeechToTextProvider({ maxRetries: 0 })
        .transcribe({ mediaId: "fixture-ruido", bytes: new Uint8Array([1]), mimeType: "audio/webm" });
      assert.equal(result.text, "trecho incerto");
      assert.ok(result.confidence < 0.01);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("Groq STT rejeita audio acima de 25 MB antes da rede", async () => {
  await withEnv(safeEnv(), async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    try {
      globalThis.fetch = (async () => {
        fetchCalls += 1;
        return Response.json({ text: "nao deveria executar" });
      }) as typeof fetch;
      const oversizedBlob = { size: 25 * 1024 * 1024 + 1, type: "audio/wav" } as Blob;
      await expectSttCode(
        new GroqSpeechToTextProvider().transcribe({ mediaId: "fixture-grande", blob: oversizedBlob }),
        "GROQ_STT_AUDIO_TOO_LARGE",
      );
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
