import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { gatewayConfigured, gatewayRequest } from "@/lib/agent/whatsapp/gateway-client";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function activeSession() {
  const { data, error } = await supabaseAdmin().from("whatsapp_sessions").select("id,status,connected_phone,last_connected_at,last_activity_at,heartbeat_at,failure_reason,reconnect_attempts,circuit_state,circuit_open_until,qr_expires_at,updated_at").neq("status", "logged_out").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a sessão.");
  return data;
}
async function audit(id: string, eventType: string) { await supabaseAdmin().from("agent_events").insert({ entity_type: "whatsapp_session", entity_id: id, event_type: eventType, actor_type: "human", actor_id: "crm_operator" }); }

export async function GET(request: Request) {
  try {
    const session = await activeSession();
    if (!session) return NextResponse.json({ configured: gatewayConfigured(), session: null });
    if (new URL(request.url).searchParams.get("action") === "qr") {
      const qr = await gatewayRequest<{ value: string; expiresAt: string }>(`/sessions/${session.id}/qr`);
      return NextResponse.json({ expiresAt: qr.expiresAt, dataUrl: await QRCode.toDataURL(qr.value, { width: 320, margin: 2, color: { dark: "#080808", light: "#ffffff" } }) });
    }
    const live = gatewayConfigured() ? await gatewayRequest(`/sessions/${session.id}`).catch(() => null) : null;
    return NextResponse.json({ configured: gatewayConfigured(), session: live || session, readBack: Boolean(live) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao consultar sessão." }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json().catch(() => ({})) as { action?: "create" | "connect" | "disconnect" | "reconnect" | "logout" };
    const action = input.action || "create";
    const active = await activeSession();
    let sessionId: string;
    if (action === "create" && !active) { const created = await gatewayRequest<{ id: string }>("/sessions", { method: "POST", body: JSON.stringify({ userId: "crm_operator" }) }); sessionId = created.id; await audit(sessionId, "WHATSAPP_SESSION_CREATED"); }
    else { if (!active) return NextResponse.json({ error: "Crie uma sessão antes desta ação." }, { status: 409 }); sessionId = active.id; const endpoint = action === "create" ? "connect" : action; await gatewayRequest(`/sessions/${sessionId}/${endpoint}`, { method: "POST", body: "{}" }); await audit(sessionId, `WHATSAPP_${endpoint.toUpperCase()}_REQUESTED`); }
    const readBack = await gatewayRequest(`/sessions/${sessionId}`);
    return NextResponse.json({ session: readBack, readBack: true }, { status: action === "create" ? 201 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ação indisponível." }, { status: 503 }); }
}
