import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GatewayDispatcherProvider, ProviderAckStatus } from "./dispatcher-provider.js";

type QueueItem = {
  id: number;
  campaign_id: string;
  client_id: number;
  conversation_id: string | null;
  phone_e164: string | null;
  rendered_body: string | null;
  media_id: string | null;
  media_version: number | null;
};

type WorkerOptions = {
  workerId?: string;
  pollMs: number;
  leaseSeconds: number;
  claimLimit: number;
  enabled: boolean;
};

const unknownAcceptance = (error: unknown) =>
  error instanceof Error && error.message === "PROVIDER_ACK_TIMEOUT_UNKNOWN_RESULT";

const ackLevel = (status: ProviderAckStatus) => status === "server_ack" ? "SERVER_ACK"
  : status === "delivered" ? "DELIVERED" : "READ";

export class DispatcherWorker {
  private readonly workerId: string;
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopping = false;
  private lastPollAt: string | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly provider: GatewayDispatcherProvider,
    private readonly options: WorkerOptions,
  ) { this.workerId = options.workerId || `gateway-${randomUUID()}`; }

  start() {
    if (!this.options.enabled || this.timer) return;
    this.stopping = false;
    this.timer = setInterval(() => void this.tick(), this.options.pollMs);
    this.timer.unref();
    void this.tick();
  }

  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    while (this.running) await new Promise(resolve => setTimeout(resolve, 10));
  }

  snapshot() {
    return { enabled: this.options.enabled, running: Boolean(this.timer), workerId: this.workerId,
      lastPollAt: this.lastPollAt, lastError: this.lastError };
  }

  async tick() {
    if (!this.options.enabled || this.running || this.stopping) return;
    this.running = true;
    this.lastPollAt = new Date().toISOString();
    try {
      const recovered = await this.db.rpc("recover_expired_whatsapp_claims");
      if (recovered.error) throw new Error(`CLAIM_RECOVERY_FAILED:${recovered.error.code}`);
      const claimed = await this.db.rpc("claim_whatsapp_campaign_items", {
        p_worker_id: this.workerId, p_limit: this.options.claimLimit, p_lease_seconds: this.options.leaseSeconds,
      });
      if (claimed.error) throw new Error(`CLAIM_FAILED:${claimed.error.code}`);
      for (const item of (claimed.data || []) as QueueItem[]) {
        if (this.stopping) break;
        await this.process(item);
      }
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message.slice(0, 300) : "WORKER_FAILED";
      console.error(JSON.stringify({ level: "error", event: "dispatcher_worker_failed", message: this.lastError }));
    } finally { this.running = false; }
  }

  private async process(item: QueueItem) {
    const revalidation = await this.db.rpc("revalidate_whatsapp_campaign_item", {
      p_queue_id: item.id, p_worker_id: this.workerId,
    });
    if (revalidation.error) return this.fail(item, `REVALIDATION_FAILED:${revalidation.error.code}`, false);
    if (!revalidation.data?.allowed) return;
    const { data: campaign, error: campaignError } = await this.db.from("whatsapp_campaigns")
      .select("session_id,media_text_interval_seconds").eq("id", item.campaign_id).single();
    if (campaignError || !campaign?.session_id) return this.fail(item, "CAMPAIGN_SESSION_MISSING", false);
    if (!this.provider.isConnected(campaign.session_id)) {
      await this.db.rpc("pause_whatsapp_campaign_system", { p_campaign_id: item.campaign_id, p_reason: "SESSION_DISCONNECTED" });
      return this.fail(item, "SESSION_DISCONNECTED", false);
    }
    if (!item.phone_e164 || !item.conversation_id || !item.rendered_body) return this.fail(item, "ITEM_SNAPSHOT_INCOMPLETE", false);
    let acceptedByProvider = false;
    let phaseAuthorized = false;
    try {
      if (item.media_id && item.media_version) {
        await this.renew(item.id);
        const { data: media, error } = await this.db.from("whatsapp_dispatch_media")
          .select("media_type,storage_path,mime_type,name").eq("id", item.media_id).eq("version", item.media_version).eq("active", true).single();
        if (error || !media) throw new Error("MEDIA_SNAPSHOT_NOT_FOUND");
        const mediaAuthorization = await this.authorize(item.id, "MEDIA");
        if (!mediaAuthorization) return;
        phaseAuthorized = true;
        const accepted = await this.provider.acceptMedia({ sessionId: campaign.session_id, phone: item.phone_e164, media: {
          type: String(media.media_type).toLowerCase() as "image" | "video" | "document",
          storageBucket: "whatsapp-media", storagePath: media.storage_path, mimeType: media.mime_type,
          fileName: media.name,
        } });
        acceptedByProvider = true;
        await this.recordAccepted(item, "MEDIA", mediaAuthorization, accepted.providerMessageId);
        const mediaAck = await this.provider.waitForAck(campaign.session_id, accepted.providerMessageId);
        await this.persistAndAck(item, "MEDIA", mediaAuthorization, accepted.providerMessageId,
          mediaAck.status, campaign.session_id, String(media.media_type).toLowerCase(), null);
        acceptedByProvider = false;
        phaseAuthorized = false;
        if (campaign.media_text_interval_seconds > 0) await new Promise(resolve => setTimeout(resolve, campaign.media_text_interval_seconds * 1_000));
      }
      await this.renew(item.id);
      const textAuthorization = await this.authorize(item.id, "TEXT");
      if (!textAuthorization) return;
      phaseAuthorized = true;
      const accepted = await this.provider.acceptText({ sessionId: campaign.session_id, phone: item.phone_e164, text: item.rendered_body });
      acceptedByProvider = true;
      await this.recordAccepted(item, "TEXT", textAuthorization, accepted.providerMessageId);
      const textAck = await this.provider.waitForAck(campaign.session_id, accepted.providerMessageId);
      await this.persistAndAck(item, "TEXT", textAuthorization, accepted.providerMessageId,
        textAck.status, campaign.session_id, "text", item.rendered_body);
      acceptedByProvider = false;
      phaseAuthorized = false;
      const finalized = await this.db.rpc("finalize_whatsapp_dispatch_item", { p_queue_id: item.id, p_worker_id: this.workerId });
      if (finalized.error) throw new Error(`FINALIZE_FAILED:${finalized.error.code}`);
    } catch (error) {
      await this.fail(item, error instanceof Error ? error.message : "DISPATCH_FAILED",
        phaseAuthorized || acceptedByProvider || unknownAcceptance(error));
    }
  }

  private async renew(queueId: number) {
    const result = await this.db.rpc("renew_whatsapp_dispatch_claim", {
      p_queue_id: queueId, p_worker_id: this.workerId, p_lease_seconds: 600,
    });
    if (result.error) throw new Error(`LEASE_RENEW_FAILED:${result.error.code}`);
  }

  private async authorize(queueId: number, phase: "MEDIA" | "TEXT") {
    const result = await this.db.rpc("authorize_whatsapp_dispatch_phase", {
      p_queue_id: queueId, p_worker_id: this.workerId, p_phase: phase,
    });
    if (result.error) throw new Error(`PHASE_AUTHORIZATION_FAILED:${result.error.code}`);
    if (!result.data?.allowed) return null;
    const token = typeof result.data.authorizationToken === "string" ? result.data.authorizationToken : "";
    if (!token) throw new Error("PHASE_AUTHORIZATION_TOKEN_MISSING");
    return token;
  }

  private async recordAccepted(item: QueueItem, phase: "MEDIA" | "TEXT",
    authorizationToken: string, providerMessageId: string) {
    const result = await this.db.rpc("record_whatsapp_dispatch_authorized_ack", {
      p_queue_id: item.id, p_worker_id: this.workerId, p_phase: phase,
      p_authorization_token: authorizationToken,
      p_provider_message_id: providerMessageId, p_ack_level: "ACCEPTED", p_whatsapp_message_id: null,
    });
    if (result.error) throw new Error(`ACCEPTANCE_PERSIST_FAILED:${result.error.code}`);
  }

  private async persistAndAck(item: QueueItem, phase: "MEDIA" | "TEXT", authorizationToken: string,
    providerMessageId: string, status: ProviderAckStatus, sessionId: string,
    messageType: string, body: string | null) {
    const { data: message, error } = await this.db.from("whatsapp_messages").upsert({
      conversation_id: item.conversation_id, client_id: item.client_id, provider_message_id: providerMessageId,
      direction: "outbound", message_type: messageType, body, status: "sent",
      provider_timestamp: new Date().toISOString(), idempotency_key: `dispatcher:${item.id}:${phase}`,
      media_metadata: phase === "MEDIA" ? { campaignQueueId: item.id } : {},
    }, { onConflict: "provider_message_id" }).select("id,provider_message_id,client_id,conversation_id,status").single();
    if (error || !message || message.provider_message_id !== providerMessageId || Number(message.client_id) !== item.client_id
      || message.conversation_id !== item.conversation_id || message.status !== "sent") throw new Error("MESSAGE_READ_BACK_FAILED");
    const ack = await this.db.rpc("record_whatsapp_dispatch_authorized_ack", {
      p_queue_id: item.id, p_worker_id: this.workerId, p_phase: phase,
      p_authorization_token: authorizationToken,
      p_provider_message_id: providerMessageId, p_ack_level: ackLevel(status), p_whatsapp_message_id: message.id,
    });
    if (ack.error) throw new Error(`ACK_PERSIST_FAILED:${ack.error.code}`);
    await this.db.from("whatsapp_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", sessionId);
  }

  private async fail(item: QueueItem, reason: string, acceptanceUnknown: boolean) {
    const result = await this.db.rpc("retry_or_fail_whatsapp_dispatch_item", {
      p_queue_id: item.id, p_worker_id: this.workerId, p_reason: reason.slice(0, 300),
      p_acceptance_unknown: acceptanceUnknown,
    });
    if (result.error) console.error(JSON.stringify({ level: "error", event: "dispatcher_item_fail_persist_failed", queueId: item.id, code: result.error.code }));
  }
}
