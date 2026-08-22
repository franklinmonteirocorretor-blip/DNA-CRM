import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DispatcherWorker } from "../src/dispatcher-worker.js";
import type { GatewayDispatcherProvider } from "../src/dispatcher-provider.js";

type RpcResult = { data: unknown; error: { code: string } | null };
type RpcHandler = (params?: Record<string, unknown>) => RpcResult | Promise<RpcResult>;

const item = {
  id: 41, campaign_id: "campaign-test", client_id: 7,
  conversation_id: "conversation-test", phone_e164: "+5511999999999",
  rendered_body: "Mensagem controlada", media_id: null, media_version: null,
};

class FakeDb {
  readonly calls: Array<{ name: string; params?: Record<string, unknown> }> = [];
  readonly writes: Array<{ table: string; operation: string; value: unknown }> = [];

  constructor(private readonly handlers: Record<string, RpcHandler>) {}

  async rpc(name: string, params?: Record<string, unknown>) {
    this.calls.push({ name, params });
    return this.handlers[name]?.(params) ?? { data: null, error: null };
  }

  from(table: string) {
    const db = this;
    let operation = "select";
    let value: unknown;
    const result = () => table === "whatsapp_campaigns"
      ? { data: { session_id: "session-test", media_text_interval_seconds: 0 }, error: null }
      : table === "whatsapp_messages"
        ? { data: { id: 91, provider_message_id: "provider-1", client_id: item.client_id,
          conversation_id: item.conversation_id, status: "sent" }, error: null }
        : { data: null, error: null };
    const query = {
      select() { return query; },
      eq() { return query; },
      upsert(input: unknown) { operation = "upsert"; value = input; db.writes.push({ table, operation, value }); return query; },
      update(input: unknown) { operation = "update"; value = input; db.writes.push({ table, operation, value }); return query; },
      async single() { return result(); },
      then(resolve: (output: ReturnType<typeof result>) => unknown) { return Promise.resolve(result()).then(resolve); },
    };
    return query;
  }
}

function worker(db: FakeDb, provider: Partial<GatewayDispatcherProvider>, workerId: string) {
  return new DispatcherWorker(db as unknown as SupabaseClient, provider as GatewayDispatcherProvider, {
    enabled: true, workerId, pollMs: 1_000, leaseSeconds: 60, claimLimit: 1,
  });
}

test("claim atômico mantém um envio com dois workers concorrentes", async () => {
  let claimed = false;
  const order: string[] = [];
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: async () => {
      await new Promise((resolve) => setImmediate(resolve));
      if (claimed) return { data: [], error: null };
      claimed = true;
      return { data: [item], error: null };
    },
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: true }, error: null }),
    renew_whatsapp_dispatch_claim: () => ({ data: "lease", error: null }),
    authorize_whatsapp_dispatch_phase: () => {
      order.push("authorize");
      return { data: { allowed: true, authorizationToken: "token-1" }, error: null };
    },
    record_whatsapp_dispatch_authorized_ack: () => ({ data: { recorded: true }, error: null }),
    finalize_whatsapp_dispatch_item: () => ({ data: { status: "SENT" }, error: null }),
  });
  let sends = 0;
  const provider = { isConnected: () => true, acceptText: async () => {
    order.push("provider");
    sends += 1;
    return { providerMessageId: "provider-1" };
  }, waitForAck: async () => ({ providerMessageId: "provider-1", status: "server_ack" as const, acknowledgedAt: new Date().toISOString() }) };
  await Promise.all([worker(db, provider, "worker-a").tick(), worker(db, provider, "worker-b").tick()]);
  assert.equal(sends, 1);
  assert.deepEqual(order, ["authorize", "provider"]);
  assert.equal(db.calls.filter(({ name }) => name === "finalize_whatsapp_dispatch_item").length, 1);
});

test("revalidação negada impede provider", async () => {
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: () => ({ data: [item], error: null }),
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: false, reason: "CLIENT_REPLIED" }, error: null }),
  });
  let sends = 0;
  await worker(db, { isConnected: () => true, acceptText: async () => { sends += 1; throw new Error("unexpected"); } }, "worker-a").tick();
  assert.equal(sends, 0);
  assert.equal(db.calls.some(({ name }) => name === "finalize_whatsapp_dispatch_item"), false);
});

test("ACK desconhecido entra em reconciliação sem retry cego", async () => {
  let claims = 0;
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: () => ({ data: claims++ === 0 ? [item] : [], error: null }),
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: true }, error: null }),
    renew_whatsapp_dispatch_claim: () => ({ data: "lease", error: null }),
    authorize_whatsapp_dispatch_phase: () => ({ data: { allowed: true, authorizationToken: "token-1" }, error: null }),
    record_whatsapp_dispatch_authorized_ack: () => ({ data: { recorded: true }, error: null }),
    retry_or_fail_whatsapp_dispatch_item: () => ({ data: { status: "RECONCILE" }, error: null }),
  });
  let sends = 0;
  const dispatcher = worker(db, { isConnected: () => true, acceptText: async () => {
    sends += 1;
    return { providerMessageId: "provider-1" };
  }, waitForAck: async () => { throw new Error("PROVIDER_ACK_TIMEOUT_UNKNOWN_RESULT"); } }, "worker-a");
  await dispatcher.tick();
  await dispatcher.tick();
  const reconciliation = db.calls.find(({ name }) => name === "retry_or_fail_whatsapp_dispatch_item");
  assert.equal(reconciliation?.params?.p_acceptance_unknown, true);
  assert.equal(sends, 1);
});

test("negação atômica da fase fecha corrida de reply antes do provider", async () => {
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: () => ({ data: [item], error: null }),
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: true }, error: null }),
    renew_whatsapp_dispatch_claim: () => ({ data: "lease", error: null }),
    authorize_whatsapp_dispatch_phase: () => ({
      data: { allowed: false, reason: "CLIENT_REPLIED", status: "CANCELLED_REPLY" }, error: null,
    }),
  });
  let sends = 0;
  await worker(db, { isConnected: () => true, acceptText: async () => {
    sends += 1;
    throw new Error("unexpected");
  } }, "worker-a").tick();
  assert.equal(sends, 0);
  assert.equal(db.calls.some(({ name }) => name === "retry_or_fail_whatsapp_dispatch_item"), false);
});

test("falha após autorização de fase exige reconciliação", async () => {
  const order: string[] = [];
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: () => ({ data: [item], error: null }),
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: true }, error: null }),
    renew_whatsapp_dispatch_claim: () => ({ data: "lease", error: null }),
    authorize_whatsapp_dispatch_phase: () => {
      order.push("authorize");
      return { data: { allowed: true, authorizationToken: "token-1" }, error: null };
    },
    retry_or_fail_whatsapp_dispatch_item: (params) => {
      order.push("reconcile");
      assert.equal(params?.p_acceptance_unknown, true);
      return { data: { status: "WAITING_RECONCILIATION" }, error: null };
    },
  });
  await worker(db, { isConnected: () => true, acceptText: async () => {
    order.push("provider");
    throw new Error("SOCKET_WRITE_AMBIGUOUS");
  } }, "worker-a").tick();
  assert.deepEqual(order, ["authorize", "provider", "reconcile"]);
});

test("sessão desconectada pausa campanha sem chamar provider", async () => {
  const db = new FakeDb({
    recover_expired_whatsapp_claims: () => ({ data: 0, error: null }),
    claim_whatsapp_campaign_items: () => ({ data: [item], error: null }),
    revalidate_whatsapp_campaign_item: () => ({ data: { allowed: true }, error: null }),
    pause_whatsapp_campaign_system: () => ({ data: { status: "PAUSED_SYSTEM" }, error: null }),
    retry_or_fail_whatsapp_dispatch_item: () => ({ data: { status: "WAITING" }, error: null }),
  });
  let sends = 0;
  await worker(db, { isConnected: () => false, acceptText: async () => { sends += 1; throw new Error("unexpected"); } }, "worker-a").tick();
  const pause = db.calls.find(({ name }) => name === "pause_whatsapp_campaign_system");
  assert.equal(pause?.params?.p_reason, "SESSION_DISCONNECTED");
  assert.equal(sends, 0);
});
