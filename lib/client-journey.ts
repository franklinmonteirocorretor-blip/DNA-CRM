import { supabaseAdmin } from "@/lib/supabase-admin";

export type JourneyTransition = {
  clientId: number;
  eventType: string;
  title: string;
  description?: string;
  funnelStage?: string | null;
  financeStage?: string | null;
  postSaleStage?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  metricKey?: string | null;
  qualification?: Record<string, unknown> | null;
};

export async function transitionClient(input: JourneyTransition) {
  const { data, error } = await supabaseAdmin().rpc(
    "transition_client_journey",
    {
      p_client_id: input.clientId,
      p_event_type: input.eventType,
      p_title: input.title,
      p_description: input.description || "",
      p_funnel_stage: input.funnelStage ?? null,
      p_finance_stage: input.financeStage ?? null,
      p_post_sale_stage: input.postSaleStage ?? null,
      p_next_action: input.nextAction ?? null,
      p_next_action_at: input.nextActionAt ?? null,
      p_metric_key: input.metricKey ?? null,
      p_qualification: input.qualification ?? null,
    },
  );
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}
