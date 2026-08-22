export type SpeechToTextInput = { mediaId: string; language?: string };
export type SpeechToTextResult = { text: string; confidence: number };
export interface SpeechToTextProvider { transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> }
export class SpeechToTextPipeline {
  constructor(private readonly provider?: SpeechToTextProvider) {}
  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    if (!this.provider) throw new Error("SPEECH_TO_TEXT_PROVIDER_NOT_CONFIGURED");
    const result = await this.provider.transcribe(input);
    if (!result.text.trim()) throw new Error("SPEECH_TO_TEXT_EMPTY_TRANSCRIPT");
    return { text: result.text.trim(), confidence: Math.max(0, Math.min(1, result.confidence)) };
  }
}
