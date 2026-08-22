export function normalizePhoneE164(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (!digits.startsWith("55")) digits = `55${digits}`;
  // WhatsApp can expose Brazilian mobile JIDs without the ninth digit.
  // Canonicalize only mobile ranges; landlines keep their eight-digit number.
  if (/^55\d{2}[6-9]\d{7}$/.test(digits)) digits = `${digits.slice(0, 4)}9${digits.slice(4)}`;
  return `+${digits}`;
}

export function resolveOutboundIdentity(input: { clientId: number; clientPhone?: string | null; conversationClientId?: number | null; conversationPhone?: string | null }) {
  const clientPhone = input.clientPhone ? normalizePhoneE164(input.clientPhone) : null;
  const conversationPhone = input.conversationPhone ? normalizePhoneE164(input.conversationPhone) : null;
  if (!clientPhone || !conversationPhone) return { allowed: false as const, reason: "Telefone canônico ou identidade da conversa ausente." };
  if (input.conversationClientId !== input.clientId || clientPhone !== conversationPhone)
    return { allowed: false as const, reason: "Conflito de identidade: cliente, telefone e conversa não coincidem." };
  return { allowed: true as const, phoneE164: clientPhone };
}
