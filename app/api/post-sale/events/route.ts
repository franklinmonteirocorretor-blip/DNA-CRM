import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
const allowed: Record<string, string> = {
  "Contrato com a construtora": "Assinatura do contrato com a construtora",
  "Sinal / ATO": "Pagamento do Sinal / ATO",
  "Entrevista CAIXA": "Entrevista com o gerente CAIXA",
  "Laudo de engenharia": "Vistoria do engenheiro CAIXA",
  "Conformidade CAIXA": "Assinatura dos formulários de conformidade",
  "Contrato CAIXA": "Assinatura do contrato com a CAIXA",
  "Preparação da entrega": "Preparação da entrega humanizada",
  "Vistoria técnica particular": "Vistoria técnica com engenheiro particular",
  "Validação dos reparos": "Validação dos reparos executados pela construtora",
  "Vistoria e chaves": "Vistoria e recebimento das chaves",
  "Evento e depoimento": "Evento de entrega, gravação e depoimento",
  "Indicações e suporte": "Indicações e suporte pós-entrega",
};
export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id,status,closed_at,vgv,clients(id,name,phone,email,data_quality,post_sale_stage,next_action,next_action_at,project_interest),projects(name)",
    )
    .is("cancelled_at", null)
    .order("closed_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const clientIds = (data || [])
    .map((sale) => {
      const client = Array.isArray(sale.clients)
        ? sale.clients[0]
        : sale.clients;
      return client?.id;
    })
    .filter((id): id is number => Boolean(id));
  const events = clientIds.length
    ? await supabase
        .from("client_events")
        .select("client_id,event_type,title,description,occurred_at")
        .in("client_id", clientIds)
        .in("event_type", [
          "REFERRAL_GIVEN",
          "BIRTHDAY_REGISTERED",
          "POST_SALE_CHECKLIST",
        ])
        .order("occurred_at", { ascending: false })
    : { data: [], error: null };
  if (events.error)
    return NextResponse.json({ error: events.error.message }, { status: 500 });
  return NextResponse.json(
    (data || []).map((sale) => {
      const client = Array.isArray(sale.clients)
        ? sale.clients[0]
        : sale.clients;
      const project = Array.isArray(sale.projects)
        ? sale.projects[0]
        : sale.projects;
      return {
        saleId: sale.id,
        clientId: client?.id,
        name: client?.name,
        phone: client?.phone || "",
        email: client?.email || "",
        project:
          project?.name ||
          client?.project_interest ||
          "Empreendimento não informado",
        unit: "Unidade escolhida no fechamento",
        stage: client?.post_sale_stage || "Contrato com a construtora",
        next: client?.next_action || "Formalizar contrato com a construtora",
        due: client?.next_action_at || null,
        closedAt: sale.closed_at,
        vgv: Number(sale.vgv || 0),
        isTest: client?.data_quality === "teste",
        referrals: (events.data || []).filter(
          (event) =>
            event.client_id === client?.id &&
            event.event_type === "REFERRAL_GIVEN",
        ).length,
        birthDate:
          (events.data || []).find(
            (event) =>
              event.client_id === client?.id &&
              event.event_type === "BIRTHDAY_REGISTERED",
          )?.description || "",
        checklist: Object.fromEntries(
          (events.data || [])
            .filter(
              (event) =>
                event.client_id === client?.id &&
                event.event_type === "POST_SALE_CHECKLIST",
            )
            .reduce<Array<[string, boolean]>>((items, event) => {
              const key = event.title.replace(/^Checklist:\s*/, "");
              if (!items.some(([saved]) => saved === key))
                items.push([key, event.description === "concluido"]);
              return items;
            }, []),
        ),
      };
    }),
  );
}
export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === "stageDecision") {
    const clientId = Number(body.clientId);
    const stage = String(body.stage || "");
    if (!clientId || !allowed[stage])
      return NextResponse.json(
        { error: "Cliente e etapa ativa são obrigatórios." },
        { status: 400 },
      );
    const supabase = supabaseAdmin();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id,name,post_sale_stage")
      .eq("id", clientId)
      .single();
    if (clientError)
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    const activeStage = client.post_sale_stage || "Contrato com a construtora";
    if (activeStage !== stage)
      return NextResponse.json(
        {
          error: `A etapa ativa é "${activeStage}". Atualize a tela antes de registrar.`,
        },
        { status: 409 },
      );
    const stageNames = Object.keys(allowed);
    const currentIndex = stageNames.indexOf(stage);
    const shouldAdvance = Boolean(body.advance);
    const nextStage = shouldAdvance
      ? stageNames[Math.min(currentIndex + 1, stageNames.length - 1)]
      : stage;
    const context = [
      `Resultado: ${String(body.result || "Não informado")}`,
      body.manager ? `Gerente: ${body.manager}` : "",
      body.agency ? `Agência: ${body.agency}` : "",
      body.notes ? `Observação: ${body.notes}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const nextAction = shouldAdvance
      ? nextStage === stage
        ? "Jornada pós-venda concluída"
        : `Registrar etapa: ${nextStage}`
      : `Retomar etapa: ${stage}`;
    const actions = await Promise.all([
      supabase.from("client_events").insert({
        client_id: clientId,
        event_type: "POST_SALE_STAGE_DECISION",
        title: `${stage}: ${body.result || "registro salvo"}`,
        description: context,
        new_stage: nextStage,
        metric_key: shouldAdvance
          ? "post_sale_stage_completed"
          : "post_sale_stage_followup",
      }),
      supabase
        .from("clients")
        .update({
          post_sale_stage: nextStage,
          next_action: nextAction,
          next_action_at: body.startsAt || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId),
    ]);
    if (body.startsAt) {
      actions.push(
        await supabase.from("appointments").insert({
          client_id: clientId,
          kind: stage,
          starts_at: body.startsAt,
          status: "Confirmado",
          notes: context,
          next_action: nextAction,
          next_action_at: body.startsAt,
        }),
        await supabase.from("notifications").insert({
          client_id: clientId,
          kind: "POST_SALE_EVENT",
          title: `${stage} · ${client.name}`,
          body: context,
          due_at: body.startsAt,
        }),
      );
    }
    const error = actions.find((action) => action.error)?.error;
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ saved: true, advanced: shouldAdvance, nextStage });
  }
  if (body.action === "checklist") {
    const clientId = Number(body.clientId);
    const item = String(body.item || "").trim();
    if (!clientId || !item)
      return NextResponse.json(
        { error: "Cliente e item do checklist são obrigatórios." },
        { status: 400 },
      );
    const { error } = await supabaseAdmin()
      .from("client_events")
      .insert({
        client_id: clientId,
        event_type: "POST_SALE_CHECKLIST",
        title: `Checklist: ${item}`,
        description: body.completed ? "concluido" : "pendente",
        metric_key: body.completed ? "post_sale_check_completed" : null,
      });
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ saved: true });
  }
  if (body.action === "movement") {
    const clientId = Number(body.clientId);
    if (!clientId || !body.stage)
      return NextResponse.json(
        { error: "Cliente e etapa são obrigatórios." },
        { status: 400 },
      );
    const supabase = supabaseAdmin();
    const { data: movementClient, error: movementClientError } = await supabase
      .from("clients")
      .select("post_sale_stage")
      .eq("id", clientId)
      .single();
    if (movementClientError)
      return NextResponse.json(
        { error: movementClientError.message },
        { status: 500 },
      );
    const activeStage =
      movementClient.post_sale_stage || "Contrato com a construtora";
    if (body.stage !== activeStage)
      return NextResponse.json(
        {
          error: `A etapa ativa é "${activeStage}". Registre o marco antes de avançar.`,
        },
        { status: 409 },
      );
    const nextActionAt = body.startsAt || null;
    const results = await Promise.all([
      supabase.from("client_events").insert({
        client_id: clientId,
        event_type: "POST_SALE_MOVEMENT",
        title: `Pós-venda atualizado: ${body.stage}`,
        description: body.notes || "Movimentação registrada.",
        new_stage: body.stage,
        metric_key: "post_sale_movement",
      }),
      supabase
        .from("clients")
        .update({
          post_sale_stage: body.stage,
          next_action: body.nextAction || null,
          next_action_at: nextActionAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId),
    ]);
    if (nextActionAt) {
      results.push(
        await supabase.from("appointments").insert({
          client_id: clientId,
          kind: body.stage,
          starts_at: nextActionAt,
          status: "Confirmado",
          notes: body.notes || null,
          next_action: body.nextAction || body.stage,
          next_action_at: nextActionAt,
        }),
      );
    }
    const error = results.find((result) => result.error)?.error;
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ updated: true });
  }
  if (body.action === "referral") {
    const clientId = Number(body.clientId);
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (!clientId || !body.name || !phone)
      return NextResponse.json(
        { error: "Nome e telefone da indicação são obrigatórios." },
        { status: 400 },
      );
    const supabase = supabaseAdmin();
    const { data: source } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    let referralId = existing?.id;
    if (!referralId) {
      const { data: created, error } = await supabase
        .from("clients")
        .insert({
          name: body.name,
          phone,
          email: body.email || null,
          origin_type: "Indicação",
          origin_detail: source?.name || "Cliente do pós-venda",
          next_action: "Realizar primeiro contato D0",
        })
        .select("id")
        .single();
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      referralId = created.id;
    }
    await Promise.all([
      supabase.from("client_events").insert({
        client_id: clientId,
        event_type: "REFERRAL_GIVEN",
        title: "Indicação registrada",
        description: `${body.name} · ${phone}`,
        metric_key: "referral",
      }),
      supabase.from("client_events").insert({
        client_id: referralId,
        event_type: "ORIGIN_UPDATE",
        title: "Origem: indicação",
        description: `Indicado por ${source?.name || "cliente do pós-venda"}`,
        metric_key: "new_referral",
      }),
    ]);
    return NextResponse.json(
      { created: !existing, id: referralId },
      { status: existing ? 200 : 201 },
    );
  }
  if (body.action === "birthday") {
    const clientId = Number(body.clientId);
    const birthDate = String(body.birthDate || "");
    if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
      return NextResponse.json(
        { error: "Cliente e data de nascimento são obrigatórios." },
        { status: 400 },
      );
    const supabase = supabaseAdmin();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();
    if (clientError)
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    const [, month, day] = birthDate.split("-").map(Number);
    const now = new Date();
    let next = new Date(now.getFullYear(), month - 1, day, 9, 0, 0);
    if (next <= now)
      next = new Date(now.getFullYear() + 1, month - 1, day, 9, 0, 0);
    const message = `Feliz aniversário, ${client.name}! Que este novo ciclo seja cheio de saúde, conquistas e bons momentos no seu lar.`;
    const results = await Promise.all([
      supabase.from("client_events").insert({
        client_id: clientId,
        event_type: "BIRTHDAY_REGISTERED",
        title: "Data de nascimento confirmada",
        description: birthDate,
        metric_key: "birthday",
      }),
      supabase.from("appointments").insert({
        client_id: clientId,
        kind: "Aniversário do cliente",
        starts_at: next.toISOString(),
        status: "Programado",
        notes: message,
        next_action: "Enviar mensagem de aniversário",
        next_action_at: next.toISOString(),
      }),
      supabase.from("notifications").insert({
        client_id: clientId,
        kind: "CLIENT_BIRTHDAY",
        title: `Aniversário de ${client.name}`,
        body: message,
        due_at: next.toISOString(),
      }),
    ]);
    const error = results.find((result) => result.error)?.error;
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({
          scheduled: true,
          nextBirthday: next.toISOString(),
          message,
        });
  }
  const phone = String(body.phone || "").replace(/\D/g, "");
  if (!allowed[body.kind] || !body.startsAt || !phone)
    return NextResponse.json(
      { error: "Cliente, evento e data são obrigatórios." },
      { status: 400 },
    );
  const supabase = supabaseAdmin();
  const { data: client, error: findError } = await supabase
    .from("clients")
    .select("id,name,post_sale_stage")
    .eq("phone", phone)
    .maybeSingle();
  if (findError)
    return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!client)
    return NextResponse.json(
      { error: "Cliente não encontrado na ficha única." },
      { status: 404 },
    );
  const currentStage = client.post_sale_stage || "Contrato com a construtora";
  if (currentStage !== body.kind)
    return NextResponse.json(
      { error: `Registre primeiro o marco "${currentStage}".` },
      { status: 409 },
    );
  const nextStage = allowed[body.nextStage] ? body.nextStage : body.kind;
  const title = allowed[body.kind];
  const actions = await Promise.all([
    supabase.from("appointments").insert({
      client_id: client.id,
      kind: body.kind,
      starts_at: body.startsAt,
      status: "Confirmado",
      notes: body.notes || null,
      next_action: title,
      next_action_at: body.startsAt,
    }),
    supabase.from("notifications").insert({
      client_id: client.id,
      kind: "POST_SALE_EVENT",
      title: `${title} · ${client.name}`,
      body: body.notes || "Compromisso gerado automaticamente pelo pós-venda.",
      due_at: body.startsAt,
    }),
    supabase.from("client_events").insert({
      client_id: client.id,
      event_type: "POST_SALE_SCHEDULED",
      title: `${title} agendado`,
      description: body.notes || `Data confirmada: ${body.startsAt}`,
      new_stage: nextStage,
      metric_key: "post_sale_scheduled",
    }),
    supabase
      .from("clients")
      .update({
        post_sale_stage: nextStage,
        next_action:
          nextStage === body.kind
            ? "Jornada pós-venda concluída"
            : `Registrar marco: ${nextStage}`,
        next_action_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id),
  ]);
  const error = actions.find((result) => result.error)?.error;
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json(
        { created: true, title, startsAt: body.startsAt, nextStage },
        { status: 201 },
      );
}
