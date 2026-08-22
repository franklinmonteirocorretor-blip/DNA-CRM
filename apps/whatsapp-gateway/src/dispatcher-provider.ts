export type ProviderAckStatus = "server_ack" | "delivered" | "read" | "played";

export type AcceptedProviderMessage = {
  providerMessageId?: string | null;
  accepted: boolean;
};

export type DispatchMedia = {
  type: "image" | "video" | "document";
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileName?: string | null;
  caption?: string | null;
};

export type ProviderAck = {
  providerMessageId: string;
  status: ProviderAckStatus;
  acknowledgedAt: string;
};

type AckWaiter = {
  resolve: (ack: ProviderAck) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

const ackStatus = (status: number): ProviderAckStatus | null => {
  if (status >= 5) return "played";
  if (status === 4) return "read";
  if (status === 3) return "delivered";
  if (status === 2) return "server_ack";
  return null;
};

export class ProviderAckRegistry {
  private readonly observed = new Map<string, ProviderAck>();
  private readonly observedErrors = new Set<string>();
  private readonly waiters = new Map<string, Set<AckWaiter>>();

  observe(sessionId: string, providerMessageId: string, status: number, acknowledgedAt = new Date().toISOString()) {
    const key = `${sessionId}:${providerMessageId}`;
    if (status === 0) {
      const waiters = this.waiters.get(key);
      if (!waiters?.size) {
        this.observedErrors.add(key);
        if (this.observedErrors.size > 1_000) this.observedErrors.delete(this.observedErrors.values().next().value!);
      }
      for (const waiter of waiters || []) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error("PROVIDER_ACK_ERROR"));
      }
      this.waiters.delete(key);
      return;
    }
    const normalized = ackStatus(status);
    if (!normalized) return;
    const ack = { providerMessageId, status: normalized, acknowledgedAt } satisfies ProviderAck;
    const waiters = this.waiters.get(key);
    if (!waiters?.size) {
      this.observed.set(key, ack);
      if (this.observed.size > 1_000) this.observed.delete(this.observed.keys().next().value!);
    }
    for (const waiter of waiters || []) {
      clearTimeout(waiter.timer);
      waiter.resolve(ack);
    }
    this.waiters.delete(key);
  }

  wait(sessionId: string, providerMessageId: string, timeoutMs: number): Promise<ProviderAck> {
    const key = `${sessionId}:${providerMessageId}`;
    if (this.observedErrors.delete(key)) return Promise.reject(new Error("PROVIDER_ACK_ERROR"));
    const existing = this.observed.get(key);
    if (existing) {
      this.observed.delete(key);
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const waiter = {} as AckWaiter;
      waiter.resolve = resolve;
      waiter.reject = reject;
      waiter.timer = setTimeout(() => {
        this.waiters.get(key)?.delete(waiter);
        if (!this.waiters.get(key)?.size) this.waiters.delete(key);
        reject(new Error("PROVIDER_ACK_TIMEOUT_UNKNOWN_RESULT"));
      }, timeoutMs);
      waiter.timer.unref();
      this.waiters.set(key, new Set([...(this.waiters.get(key) || []), waiter]));
    });
  }

  clearSession(sessionId: string) {
    const prefix = `${sessionId}:`;
    for (const [key, waiters] of this.waiters) if (key.startsWith(prefix)) {
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error("PROVIDER_SESSION_DISCONNECTED"));
      }
      this.waiters.delete(key);
    }
    for (const key of this.observed.keys()) if (key.startsWith(prefix)) this.observed.delete(key);
    for (const key of this.observedErrors) if (key.startsWith(prefix)) this.observedErrors.delete(key);
  }
}

export interface DispatcherSessionTransport {
  isConnected(sessionId: string): boolean;
  sendText(sessionId: string, phone: string, text: string): Promise<AcceptedProviderMessage>;
  sendMedia(sessionId: string, phone: string, media: DispatchMedia): Promise<AcceptedProviderMessage>;
  waitForProviderAck(sessionId: string, providerMessageId: string, timeoutMs: number): Promise<ProviderAck>;
}

export class GatewayDispatcherProvider {
  constructor(
    private readonly transport: DispatcherSessionTransport,
    private readonly ackTimeoutMs = 20_000,
  ) {}

  isConnected(sessionId: string) { return this.transport.isConnected(sessionId); }

  async acceptText(input: { sessionId: string; phone: string; text: string }) {
    const accepted = await this.transport.sendText(input.sessionId, input.phone, input.text);
    if (!accepted.accepted || !accepted.providerMessageId) throw new Error("PROVIDER_DID_NOT_ACCEPT_MESSAGE");
    return { providerMessageId: accepted.providerMessageId };
  }

  async acceptMedia(input: { sessionId: string; phone: string; media: DispatchMedia }) {
    const accepted = await this.transport.sendMedia(input.sessionId, input.phone, input.media);
    if (!accepted.accepted || !accepted.providerMessageId) throw new Error("PROVIDER_DID_NOT_ACCEPT_MEDIA");
    return { providerMessageId: accepted.providerMessageId };
  }

  waitForAck(sessionId: string, providerMessageId: string) {
    return this.transport.waitForProviderAck(sessionId, providerMessageId, this.ackTimeoutMs);
  }

  async sendText(input: { sessionId: string; phone: string; text: string }) {
    const accepted = await this.acceptText(input);
    const ack = await this.waitForAck(input.sessionId, accepted.providerMessageId);
    return { providerMessageId: accepted.providerMessageId, ack };
  }

  async sendMedia(input: { sessionId: string; phone: string; media: DispatchMedia }) {
    const accepted = await this.acceptMedia(input);
    const ack = await this.waitForAck(input.sessionId, accepted.providerMessageId);
    return { providerMessageId: accepted.providerMessageId, ack };
  }
}
