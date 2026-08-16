import type { SupabaseClient } from "@supabase/supabase-js";
import makeWASocket, { DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import { pino } from "pino";
import { config } from "./config.js";
import { SupabaseBaileysAuthStore } from "./auth-store.js";
import { reconnectPlan } from "./recovery.js";
import { createGatewaySupabaseClient } from "./supabase-client.js";

export type Lifecycle = "created" | "waiting_qr" | "connecting" | "connected" | "reconnecting" | "disconnected" | "failed" | "logged_out";
type Runtime = { socket?: WASocket; qr?: { value: string; expiresAt: string }; reconnectTimer?: NodeJS.Timeout; failures: number; stopped: boolean; gatewayMessageIds: Set<string> };

export class SessionManager {
  private readonly db: SupabaseClient;
  private readonly runtimes = new Map<string, Runtime>();
  constructor(db?: SupabaseClient) { this.db = db || createGatewaySupabaseClient(); }

  private async update(id: string, status: Lifecycle, extra: Record<string, unknown> = {}) {
    const { error } = await this.db.from("whatsapp_sessions").update({ status, heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...extra }).eq("id", id);
    if (error) throw new Error(`Session update falhou: ${error.code}`);
  }

  async create(userId: string) {
    const { data, error } = await this.db.from("whatsapp_sessions").insert({ user_id: userId, status: "created" }).select("id,status,user_id").single();
    if (error) throw new Error(`Session create falhou: ${error.code}`);
    return data as { id: string; status: Lifecycle; user_id: string };
  }

  async status(id: string) {
    const { data, error } = await this.db.from("whatsapp_sessions").select("id,status,connected_phone,last_connected_at,last_activity_at,heartbeat_at,failure_reason,reconnect_attempts,circuit_state,circuit_open_until,updated_at").eq("id", id).single();
    if (error) throw new Error("Sessão não encontrada.");
    return data;
  }

  async restoreActiveSessions() {
    const { data, error } = await this.db
      .from("whatsapp_sessions")
      .select("id,status,circuit_state,circuit_open_until")
      .in("status", ["waiting_qr", "connecting", "connected", "reconnecting"]);
    if (error) throw new Error(`Session restore falhou: ${error.code}`);

    for (const session of data || []) {
      const openUntil = session.circuit_open_until ? Date.parse(session.circuit_open_until) : 0;
      if (session.circuit_state === "open" && openUntil > Date.now()) {
        this.scheduleHalfOpen(session.id, openUntil - Date.now());
      } else {
        void this.connect(session.id, true).catch(error => {
          console.error(JSON.stringify({ level: "error", event: "session_restore_failed", sessionId: session.id, message: error instanceof Error ? error.message : "unknown" }));
        });
      }
    }
    return { restored: data?.length || 0 };
  }

  private scheduleHalfOpen(id: string, delayMs = config.circuitCooldownMs) {
    const runtime = this.runtimes.get(id) || { failures: 0, stopped: false, gatewayMessageIds: new Set<string>() };
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    this.runtimes.set(id, runtime);
    runtime.reconnectTimer = setTimeout(() => {
      if (runtime.stopped) return;
      void this.update(id, "reconnecting", { circuit_state: "half_open", circuit_open_until: null })
        .then(() => this.connect(id, true))
        .catch(error => console.error(JSON.stringify({ level: "error", event: "circuit_recovery_failed", sessionId: id, message: error instanceof Error ? error.message : "unknown" })));
    }, Math.max(1_000, delayMs));
    runtime.reconnectTimer.unref();
  }

  async connect(id: string, reconnecting = false) {
    const current = this.runtimes.get(id);
    if (current?.socket && !current.stopped) return this.status(id);
    const runtime: Runtime = current || { failures: 0, stopped: false, gatewayMessageIds: new Set<string>() };
    runtime.stopped = false;
    this.runtimes.set(id, runtime);
    await this.update(id, reconnecting ? "reconnecting" : "connecting", { failure_reason: null });
    const auth = await new SupabaseBaileysAuthStore(id, this.db).load();
    const socket = makeWASocket({
      auth: auth.state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });
    runtime.socket = socket;
    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
      if (qr) { runtime.qr = { value: qr, expiresAt: new Date(Date.now() + 55_000).toISOString() }; await this.update(id, "waiting_qr", { qr_expires_at: runtime.qr.expiresAt }); }
      if (connection === "open") { runtime.qr = undefined; runtime.failures = 0; await this.update(id, "connected", { qr_expires_at: null, connected_phone: socket.user?.id || null, last_connected_at: new Date().toISOString(), last_activity_at: new Date().toISOString(), reconnect_attempts: 0, circuit_state: "closed", circuit_open_until: null }); }
      if (connection === "close" && !runtime.stopped) {
        runtime.socket = undefined;
        const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) { runtime.stopped = true; runtime.qr = undefined; await auth.clear(); await this.update(id, "logged_out", { failure_reason: "Sessão encerrada pelo WhatsApp.", qr_expires_at: null }); return; }
        runtime.failures += 1;
        const { openCircuit, waitMs: wait } = reconnectPlan(runtime.failures);
        await this.update(id, openCircuit ? "failed" : "reconnecting", { reconnect_attempts: runtime.failures, failure_reason: lastDisconnect?.error?.message?.slice(0, 300) || "Conexão interrompida.", circuit_state: openCircuit ? "open" : "closed", circuit_open_until: openCircuit ? new Date(Date.now() + config.circuitCooldownMs).toISOString() : null });
        if (openCircuit) this.scheduleHalfOpen(id);
        else runtime.reconnectTimer = setTimeout(() => { void this.connect(id, true); }, wait);
      }
    });
    socket.ev.on("messages.upsert", async ({ messages }) => {
      await this.update(id, "connected", { last_activity_at: new Date().toISOString() });
      if (!config.crmInboundUrl) return;
      for (const message of messages) if (message.key.id && message.key.remoteJid) { const gatewayOrigin = runtime.gatewayMessageIds.delete(message.key.id); await fetch(config.crmInboundUrl, { method: "POST", headers: { "content-type": "application/json", "x-gateway-secret": config.gatewaySecret }, body: JSON.stringify({ sessionId: id, providerMessageId: message.key.id, providerConversationId: message.key.remoteJid, fromMe: Boolean(message.key.fromMe), manual: Boolean(message.key.fromMe) && !gatewayOrigin, text: message.message?.conversation || message.message?.extendedTextMessage?.text, messageType: message.message?.audioMessage ? "audio" : message.message?.documentMessage ? "document" : message.message?.imageMessage ? "image" : message.message?.videoMessage ? "video" : "text", occurredAt: new Date().toISOString() }) }).catch(() => undefined); }
    });
    return this.status(id);
  }

  async disconnect(id: string) { const runtime = this.runtimes.get(id); if (runtime) { runtime.stopped = true; if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer); runtime.socket?.end(undefined); this.runtimes.delete(id); } await this.update(id, "disconnected", { qr_expires_at: null }); return this.status(id); }
  async reconnect(id: string) { await this.disconnect(id); return this.connect(id, true); }
  async logout(id: string) { const runtime = this.runtimes.get(id); if (runtime) { runtime.stopped = true; if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer); await runtime.socket?.logout().catch(() => undefined); this.runtimes.delete(id); } await new SupabaseBaileysAuthStore(id, this.db).load().then(auth => auth.clear()); await this.update(id, "logged_out", { connected_phone: null, qr_expires_at: null, failure_reason: null }); return this.status(id); }
  async sendText(id: string, phone: string, text: string) {
    if (!config.realOutboundEnabled) throw new Error("Outbound real desativado.");
    const normalized = phone.replace(/\D/g, "");
    if (!config.authorizedTestNumbers.has(normalized)) throw new Error("Destinatário fora da allowlist de teste.");
    const runtime = this.runtimes.get(id);
    if (!runtime?.socket) throw new Error("Sessão não conectada.");
    const result = await runtime.socket.sendMessage(`${normalized}@s.whatsapp.net`, { text });
    if (result?.key.id) runtime.gatewayMessageIds.add(result.key.id);
    await this.update(id, "connected", { last_activity_at: new Date().toISOString() });
    return { providerMessageId: result?.key.id, accepted: Boolean(result?.key.id) };
  }
  qr(id: string) { const qr = this.runtimes.get(id)?.qr; if (!qr || Date.parse(qr.expiresAt) <= Date.now()) throw new Error("QR indisponível ou expirado."); return qr; }
  heartbeat() { return Promise.all([...this.runtimes.keys()].map(id => this.db.from("whatsapp_sessions").update({ heartbeat_at: new Date().toISOString() }).eq("id", id))); }
}
