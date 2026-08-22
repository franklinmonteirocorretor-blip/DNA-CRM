export type SpeechToTextBytes = ArrayBuffer | Uint8Array;

export type SpeechToTextInput = {
  mediaId: string;
  language?: string;
  bytes?: SpeechToTextBytes;
  blob?: Blob;
  mimeType?: string;
  fileName?: string;
};

export type SpeechToTextRateLimit = {
  limitRequests?: number;
  remainingRequests?: number;
  resetRequests?: string;
};

export type SpeechToTextTelemetry = {
  provider: string;
  model: string;
  latencyMs: number;
  retryCount: number;
  status: number;
  rateLimit?: SpeechToTextRateLimit;
};

export type SpeechToTextResult = {
  text: string;
  confidence: number;
  telemetry?: SpeechToTextTelemetry;
};
export interface SpeechToTextProvider { transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> }
export class SpeechToTextPipeline {
  constructor(private readonly provider?: SpeechToTextProvider, private readonly minimumConfidence = 0.6) {}
  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    if (!this.provider) throw new Error("SPEECH_TO_TEXT_PROVIDER_NOT_CONFIGURED");
    const result = await this.provider.transcribe(input);
    if (!result.text.trim()) throw new Error("SPEECH_TO_TEXT_EMPTY_TRANSCRIPT");
    if (!Number.isFinite(result.confidence)) throw new Error("SPEECH_TO_TEXT_INVALID_CONFIDENCE");
    if (result.confidence < this.minimumConfidence) throw new Error("SPEECH_TO_TEXT_LOW_CONFIDENCE");
    return {
      ...result,
      text: result.text.trim(),
      confidence: Math.max(0, Math.min(1, result.confidence)),
    };
  }
}
