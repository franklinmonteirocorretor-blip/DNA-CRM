import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260822215400_harden_whatsapp_dispatch_runtime.sql", import.meta.url),
  "utf8",
);

const phaseAuthorizationMigration = readFileSync(
  new URL("../supabase/migrations/20260822221428_harden_dispatcher_phase_authorization.sql", import.meta.url),
  "utf8",
);

const scopeLockMigration = readFileSync(
  new URL("../supabase/migrations/20260822222848_lock_dispatch_test_scope.sql", import.meta.url),
  "utf8",
);

test("runtime schema persists campaign, lease and retry state", () => {
  for (const contract of [
    "current_batch", "batch_sent_count", "next_batch_at", "next_send_at",
    "worker_id", "claimed_at", "lease_expires_at", "next_attempt_at",
    "rendered_body", "conversation_id", "provider_identity", "last_inbound_seen_at",
    "max_attempts", "retry_delay_seconds", "retry_backoff_multiplier",
  ]) assert.match(migration, new RegExp(`\\b${contract}\\b`));
});

test("runtime schema models durable delivery and attempt ledgers", () => {
  assert.match(migration, /create table public\.whatsapp_campaign_item_deliveries/);
  assert.match(migration, /unique \(queue_id, phase\)/);
  assert.match(migration, /unique \(provider_message_id\)/);
  assert.match(migration, /create table public\.whatsapp_campaign_attempts/);
  assert.match(migration, /UNKNOWN_ACCEPTANCE/);
});

test("claim uses row locking, ownership and expiring leases", () => {
  assert.match(migration, /create or replace function public\.claim_whatsapp_campaign_items/);
  assert.match(migration, /for update of q skip locked/i);
  assert.match(migration, /lease_expires_at = now\(\) \+ make_interval/);
  assert.match(migration, /q\.worker_id is distinct from btrim\(p_worker_id\)/);
});

test("recovery never blindly retries accepted provider sends", () => {
  assert.match(migration, /status = 'WAITING_RECONCILIATION'/);
  assert.match(migration, /LEASE_EXPIRED_AFTER_PROVIDER_ACCEPTANCE/);
  assert.match(migration, /status in \('ACCEPTED','SERVER_ACK','DELIVERED','READ','UNKNOWN_ACCEPTANCE'\)/);
});

test("real START remains limited to explicit test scope", () => {
  assert.match(migration, /REAL_DISPATCH_REQUIRES_TEST_SCOPE/);
  assert.match(migration, /not v_campaign\.test_only/);
  assert.match(migration, /v_campaign\.campaign_limit > 5/);
});

test("pre-send revalidation covers safety gates and reply race", () => {
  for (const gate of [
    "CAMPAIGN_NOT_RUNNING", "REAL_TEST_SCOPE_REQUIRED", "KILL_SWITCH",
    "SESSION_UNHEALTHY", "CONTACT_BLOCKED", "IDENTITY_MISMATCH",
    "HUMAN_CONTROL", "CLIENT_REPLIED", "OUTSIDE_WINDOW", "LIMIT_REACHED",
  ]) assert.match(migration, new RegExp(gate));
});

test("finalization requires provider ACK and persisted read-back", () => {
  assert.match(migration, /TEXT_ACK_READ_BACK_REQUIRED/);
  assert.match(migration, /MEDIA_ACK_READ_BACK_REQUIRED/);
  assert.match(migration, /v_text\.status not in \('SERVER_ACK','DELIVERED','READ'\)/);
  assert.match(migration, /v_text\.whatsapp_message_id is null or v_text\.read_back_at is null/);
});

test("runtime RPCs remain service-role only", () => {
  assert.match(migration, /revoke execute[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute[\s\S]+to service_role/);
  assert.match(migration, /security invoker/g);
});

test("runtime real is fail-closed and bound to one expiring session", () => {
  assert.match(phaseAuthorizationMigration, /create table public\.whatsapp_dispatch_runtime_control/);
  assert.match(phaseAuthorizationMigration, /real_enabled boolean not null default false/);
  assert.match(phaseAuthorizationMigration, /authorized_session_id uuid references public\.whatsapp_sessions/);
  assert.match(phaseAuthorizationMigration, /authorization_expires_at timestamptz/);
  assert.match(phaseAuthorizationMigration, /v_runtime\.authorized_session_id is distinct from v_campaign\.session_id/);
  assert.match(phaseAuthorizationMigration, /REAL_DISPATCH_RUNTIME_NOT_AUTHORIZED/);
});

test("START and claim require canonical kill-switch and session gates", () => {
  for (const contract of [
    "REAL_DISPATCH_KILL_SWITCH_ACTIVE", "REAL_DISPATCH_SESSION_UNHEALTHY",
    "not a.kill_switch", "not a.outbound_kill_switch", "s.status = 'connected'",
    "s.circuit_state = 'closed'", "s.heartbeat_at >= now() - interval '90 seconds'",
  ]) assert.match(phaseAuthorizationMigration, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(phaseAuthorizationMigration, /p_limit <> 1/);
  assert.match(phaseAuthorizationMigration, /c\.session_id = v_runtime\.authorized_session_id/);
  assert.match(phaseAuthorizationMigration, /q\.client_id = any\(c\.test_client_ids\)/);
});

test("real queue client scope is immutable after materialization", () => {
  assert.match(phaseAuthorizationMigration, /create trigger whatsapp_dispatch_queue_test_scope_guard/);
  assert.match(phaseAuthorizationMigration, /REAL_QUEUE_OUTSIDE_TEST_SCOPE/);
  assert.match(phaseAuthorizationMigration, /create trigger whatsapp_campaign_test_scope_immutability_guard/);
  assert.match(phaseAuthorizationMigration, /REAL_TEST_SCOPE_IMMUTABLE_AFTER_MATERIALIZATION/);
  assert.match(phaseAuthorizationMigration, /not coalesce\(q\.client_id = any\(c\.test_client_ids\), false\)/);
  assert.match(phaseAuthorizationMigration, /array_position\(new\.test_client_ids, null\) is not null/);
  assert.match(scopeLockMigration, /where id = new\.campaign_id for share/);
});

test("each provider phase receives an atomic authorization token", () => {
  assert.match(phaseAuthorizationMigration, /create or replace function public\.authorize_whatsapp_dispatch_phase/);
  assert.match(phaseAuthorizationMigration, /status = case when v_phase = 'MEDIA' then 'SENDING_MEDIA' else 'SENDING_TEXT' end/);
  assert.match(phaseAuthorizationMigration, /phase_authorization_token = v_token/);
  assert.match(phaseAuthorizationMigration, /'authorizationToken',v_token/);
  assert.match(phaseAuthorizationMigration, /record_whatsapp_dispatch_authorized_ack/);
  assert.match(phaseAuthorizationMigration, /q\.phase_authorization_token is distinct from p_authorization_token/);
});

test("expired SENDING phases always enter reconciliation", () => {
  assert.match(phaseAuthorizationMigration, /q\.status in \('SENDING_MEDIA','SENDING_TEXT'\) and q\.lease_expires_at <= now\(\)/);
  assert.match(phaseAuthorizationMigration, /status = 'WAITING_RECONCILIATION'/);
  assert.match(phaseAuthorizationMigration, /LEASE_EXPIRED_DURING_SENDING_PHASE/);
  assert.match(phaseAuthorizationMigration, /q\.status in \('SENDING_MEDIA','SENDING_TEXT'\) or p_acceptance_unknown/);
});

test("phase runtime RPCs remain service-role only", () => {
  assert.match(phaseAuthorizationMigration, /revoke execute[\s\S]+from public, anon, authenticated/);
  assert.match(phaseAuthorizationMigration, /grant execute[\s\S]+to service_role/);
  assert.match(phaseAuthorizationMigration, /security invoker/g);
  assert.match(phaseAuthorizationMigration, /record_whatsapp_dispatch_ack[\s\S]+service_role/);
});
