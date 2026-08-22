import { NextResponse } from "next/server";
import { setConversationMode } from "@/lib/agent/whatsapp/service";
import type { ConversationControlMode } from "@/lib/agent/whatsapp/types";

const MODES = ["auto", "human_takeover", "observe_only", "paused"] as const;
export async function POST(request: Request, context: RouteContext<"/api/agent/conversations/[id]/control">) {
  const { id } = await context.params;
  const body = await request.json();
  if (!MODES.includes(body.mode as ConversationControlMode)) return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
  try { return NextResponse.json(await setConversationMode(id, body.mode, "crm_operator", body.reason)); }
  catch { return NextResponse.json({ error: "Não foi possível alterar o controle da conversa." }, { status: 500 }); }
}
