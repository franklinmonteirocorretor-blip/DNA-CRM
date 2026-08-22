export type WhatsAppSessionStatus = "created" | "waiting_qr" | "connecting" | "connected" | "reconnecting" | "disconnected" | "failed" | "logged_out";
export type ConversationControlMode = "auto" | "human_takeover" | "observe_only" | "paused";
export type WhatsAppProviderEvent =
  | { type: "qr"; sessionId: string; qr: string; expiresAt: string }
  | { type: "session"; sessionId: string; status: WhatsAppSessionStatus; reason?: string }
  | { type: "message"; sessionId: string; providerMessageId: string; conversationId: string; fromMe: boolean; text?: string; messageType: "text" | "audio" | "image" | "document" | "video"; occurredAt: string }
  | { type: "ack"; sessionId: string; providerMessageId: string; status: "sent" | "delivered" | "read" | "failed" };

export interface WhatsAppProvider {
  createSession(input: { userId: string }): Promise<{ sessionId: string }>;
  getQrCode(sessionId: string): Promise<{ qr: string; expiresAt?: string }>;
  getSessionHealth(sessionId: string): Promise<{ connected: boolean; lastSeenAt?: Date; reason?: string }>;
  sendText(input: { sessionId: string; conversationId: string; text: string; idempotencyKey: string }): Promise<{ providerMessageId: string }>;
  sendMedia(input: { sessionId: string; conversationId: string; mediaId: string; caption?: string; idempotencyKey: string }): Promise<{ providerMessageId: string }>;
  logout(sessionId: string): Promise<void>;
  reconnect(sessionId: string): Promise<void>;
  onEvent(handler: (event: WhatsAppProviderEvent) => Promise<void>): void;
}
