import type {
  SpeechToTextInput,
  SpeechToTextProvider,
  SpeechToTextRateLimit,
  SpeechToTextResult,
  SpeechToTextTelemetry,
} from "./speech-to-text.ts";

const GROQ_TRANSCRIPTIONS_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_API_KEY_REF = "AGENT_LLM_API_KEY_GROQ";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_RETRY_AFTER_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export const GROQ_SPEECH_MODELS = ["whisper-large-v3", "whisper-large-v3-turbo"] as const;
export type GroqSpeechModel = (typeof GROQ_SPEECH_MODELS)[number];

type GroqSpeechToTextOptions = {
  model?: GroqSpeechModel;
  timeoutMs?: number;
  maxRetries?: number;
};

type GroqSegment = {
  start?: unknown;
  end?: unknown;
  avg_logprob?: unknown;
  no_speech_prob?: unknown;
};

type GroqTranscriptPayload = {
  text?: unknown;
  segments?: unknown;
};

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "audio/flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/mpga": ".mpga",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "audio/x-m4a": ".m4a",
  "audio/x-wav": ".wav",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const SUPPORTED_EXTENSIONS = new Set([
  ".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm",
]);

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".flac": "audio/flac",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "audio/mpeg",
  ".mpga": "audio/mpga",
  ".m4a": "audio/x-m4a",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
};

export class GroqSpeechToTextError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly telemetry?: SpeechToTextTelemetry;

  constructor(code: string, status?: number, telemetry?: SpeechToTextTelemetry) {
    super(code);
    this.name = "GroqSpeechToTextError";
    this.code = code;
    this.status = status;
    this.telemetry = telemetry;
  }
}

export class GroqSpeechToTextProvider implements SpeechToTextProvider {
  private readonly model: GroqSpeechModel;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: GroqSpeechToTextOptions = {}) {
    this.model = options.model ?? "whisper-large-v3";
    if (!GROQ_SPEECH_MODELS.includes(this.model)) {
      throw new GroqSpeechToTextError("GROQ_STT_MODEL_NOT_ALLOWED");
    }
    this.timeoutMs = boundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1_000, 120_000);
    this.maxRetries = boundedInteger(options.maxRetries, 1, 0, 2);
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    assertZdrGate();
    const apiKey = process.env[GROQ_API_KEY_REF];
    if (!apiKey) throw new GroqSpeechToTextError("GROQ_STT_API_KEY_NOT_CONFIGURED");

    const audio = normalizeAudio(input);
    let retryCount = 0;
    const startedAt = Date.now();

    while (true) {
      let response: Response;
      try {
        response = await fetch(GROQ_TRANSCRIPTIONS_ENDPOINT, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}` },
          body: buildRequest(audio, input.language, this.model),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        const telemetry = createTelemetry(this.model, startedAt, retryCount, 0);
        if (isTimeoutError(error)) {
          throw new GroqSpeechToTextError("GROQ_STT_TIMEOUT", undefined, telemetry);
        }
        throw new GroqSpeechToTextError("GROQ_STT_NETWORK_ERROR", undefined, telemetry);
      }

      const rateLimit = readRateLimit(response.headers);
      const telemetry = createTelemetry(this.model, startedAt, retryCount, response.status, rateLimit);

      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfterMs = readRetryAfterMs(response.headers.get("retry-after"));
        retryCount += 1;
        await response.body?.cancel();
        await delay(retryAfterMs);
        continue;
      }

      if (!response.ok) {
        const code = response.status === 429 ? "GROQ_STT_RATE_LIMITED" : "GROQ_STT_HTTP_ERROR";
        await response.body?.cancel();
        throw new GroqSpeechToTextError(code, response.status, telemetry);
      }

      let payload: GroqTranscriptPayload;
      try {
        payload = await response.json() as GroqTranscriptPayload;
      } catch {
        throw new GroqSpeechToTextError("GROQ_STT_INVALID_RESPONSE", response.status, telemetry);
      }

      if (typeof payload.text !== "string") {
        throw new GroqSpeechToTextError("GROQ_STT_INVALID_RESPONSE", response.status, telemetry);
      }

      return {
        text: payload.text,
        confidence: confidenceFromSegments(payload.segments),
        telemetry,
      };
    }
  }
}

type NormalizedAudio = { blob: Blob; fileName: string };

function normalizeAudio(input: SpeechToTextInput): NormalizedAudio {
  if (input.blob && input.bytes) throw new GroqSpeechToTextError("GROQ_STT_AMBIGUOUS_AUDIO_INPUT");
  if (!input.blob && !input.bytes) throw new GroqSpeechToTextError("GROQ_STT_AUDIO_BYTES_REQUIRED");

  const declaredMime = normalizeMime(input.mimeType || input.blob?.type);
  const extension = resolveExtension(declaredMime, input.fileName);
  const mimeType = declaredMime || mimeForExtension(extension);
  if (!mimeType || !EXTENSION_BY_MIME[mimeType]) {
    throw new GroqSpeechToTextError("GROQ_STT_UNSUPPORTED_AUDIO_TYPE");
  }

  const blob = input.blob ?? blobFromBytes(input.bytes as NonNullable<SpeechToTextInput["bytes"]>, mimeType);
  if (blob.size === 0) throw new GroqSpeechToTextError("GROQ_STT_EMPTY_AUDIO");
  if (blob.size > MAX_AUDIO_BYTES) throw new GroqSpeechToTextError("GROQ_STT_AUDIO_TOO_LARGE");

  return { blob, fileName: `audio${extension}` };
}

function blobFromBytes(bytes: NonNullable<SpeechToTextInput["bytes"]>, mimeType: string): Blob {
  const source = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return new Blob([copy], { type: mimeType });
}

function normalizeMime(value?: string): string {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function resolveExtension(mimeType: string, fileName?: string): string {
  const byMime = EXTENSION_BY_MIME[mimeType];
  if (byMime) return byMime;
  const leaf = fileName?.split(/[\\/]/).pop()?.toLowerCase() ?? "";
  const dot = leaf.lastIndexOf(".");
  const extension = dot >= 0 ? leaf.slice(dot) : "";
  return SUPPORTED_EXTENSIONS.has(extension) ? extension : "";
}

function mimeForExtension(extension: string): string {
  return MIME_BY_EXTENSION[extension] ?? "";
}

function buildRequest(audio: NormalizedAudio, language: string | undefined, model: GroqSpeechModel): FormData {
  const form = new FormData();
  form.set("file", audio.blob, audio.fileName);
  form.set("model", model);
  form.set("language", normalizeLanguage(language));
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.set("temperature", "0");
  return form;
}

function normalizeLanguage(language?: string): string {
  if (!language) return "pt";
  const normalized = language.trim().toLowerCase().split("-", 1)[0];
  if (!/^[a-z]{2}$/.test(normalized)) throw new GroqSpeechToTextError("GROQ_STT_INVALID_LANGUAGE");
  return normalized;
}

function confidenceFromSegments(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) return 0;
  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const segment = candidate as GroqSegment;
    const avgLogprob = finiteNumber(segment.avg_logprob);
    const noSpeechProb = finiteNumber(segment.no_speech_prob);
    if (avgLogprob === undefined || noSpeechProb === undefined) continue;
    const start = finiteNumber(segment.start) ?? 0;
    const end = finiteNumber(segment.end) ?? start + 1;
    const weight = Math.max(0.01, end - start);
    const tokenConfidence = Math.exp(Math.min(0, Math.max(-10, avgLogprob)));
    const speechConfidence = 1 - clamp(noSpeechProb);
    weightedConfidence += clamp(tokenConfidence * speechConfidence) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? clamp(weightedConfidence / totalWeight) : 0;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function assertZdrGate(): void {
  if (process.env.GROQ_ZDR_REQUIRED !== "true") {
    throw new GroqSpeechToTextError("GROQ_ZDR_REQUIRED_MUST_BE_TRUE");
  }
  if (process.env.GROQ_ZDR_CONFIRMED !== "true") {
    throw new GroqSpeechToTextError("GROQ_ZDR_NOT_CONFIRMED");
  }
}

function readRateLimit(headers: Headers): SpeechToTextRateLimit | undefined {
  const limitRequests = readNonNegativeInteger(headers.get("x-ratelimit-limit-requests"));
  const remainingRequests = readNonNegativeInteger(headers.get("x-ratelimit-remaining-requests"));
  const resetRequests = readResetDuration(headers.get("x-ratelimit-reset-requests"));
  if (limitRequests === undefined && remainingRequests === undefined && resetRequests === undefined) return undefined;
  return { limitRequests, remainingRequests, resetRequests };
}

function readNonNegativeInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

function readResetDuration(value: string | null): string | undefined {
  if (!value || !/^\d+(?:\.\d+)?(?:ms|s|m|h)$/.test(value)) return undefined;
  return value;
}

function readRetryAfterMs(value: string | null): number {
  if (!value) return 1_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, seconds * 1_000));
  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs)) return 1_000;
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, dateMs - Date.now()));
}

function createTelemetry(
  model: GroqSpeechModel,
  startedAt: number,
  retryCount: number,
  status: number,
  rateLimit?: SpeechToTextRateLimit,
): SpeechToTextTelemetry {
  return {
    provider: "GROQ",
    model,
    latencyMs: Math.max(0, Date.now() - startedAt),
    retryCount,
    status,
    rateLimit,
  };
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new GroqSpeechToTextError("GROQ_STT_INVALID_OPTIONS");
  }
  return value;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
