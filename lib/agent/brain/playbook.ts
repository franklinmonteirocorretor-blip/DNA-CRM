export type PlaybookStatus = "uploaded" | "analyzing" | "review" | "active" | "failed" | "inactive";
export type PlaybookPrinciple = { technique: string; goal: string; stage: string; applicableWhen: string[]; avoidWhen: string[]; example?: string; risk?: string };
export interface PlaybookIngestionPipeline {
  analyze(input: { playbookVersionId: string; storagePath: string; mimeType: string }): Promise<{ principles: PlaybookPrinciple[]; status: "review" | "failed"; error?: string }>;
}
