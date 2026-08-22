import { randomUUID } from "node:crypto";
import type { WhatsAppProvider, WhatsAppProviderEvent } from "./types";

export class SimulationWhatsAppProvider implements WhatsAppProvider {
  private handlers = new Set<(event: WhatsAppProviderEvent) => Promise<void>>();
  async createSession(_input: { userId: string }) { return { sessionId: `simulation-${randomUUID()}` }; }
  async getQrCode(_sessionId: string) { return { qr: "SIMULATION_MODE_NO_QR" }; }
  async getSessionHealth(_sessionId: string) { return { connected: false, reason: "Simulation Mode: nenhum dispositivo externo conectado." }; }
  async sendText(_input: { sessionId: string; conversationId: string; text: string; idempotencyKey: string }) { return { providerMessageId: `simulated-${randomUUID()}` }; }
  async sendMedia(_input: { sessionId: string; conversationId: string; mediaId: string; caption?: string; idempotencyKey: string }) { return { providerMessageId: `simulated-${randomUUID()}` }; }
  async logout(_sessionId: string) {}
  async reconnect(_sessionId: string) {}
  onEvent(handler: (event: WhatsAppProviderEvent) => Promise<void>) { this.handlers.add(handler); }
}
