const baseUrl = process.env.WHATSAPP_GATEWAY_URL;
const durationMinutes = Number(process.env.SOAK_MINUTES || 60);
const intervalMs = Number(process.env.SOAK_INTERVAL_MS || 30000);
if (!baseUrl) throw new Error("WHATSAPP_GATEWAY_URL obrigatório.");
const started = Date.now(); let checks = 0; let failures = 0;
while (Date.now() - started < durationMinutes * 60000) {
  try { const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(5000) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); checks += 1; }
  catch { failures += 1; }
  await new Promise(resolve => setTimeout(resolve, intervalMs));
}
console.log(JSON.stringify({ durationMinutes, checks, failures, passed: failures === 0 }));
process.exitCode = failures === 0 ? 0 : 1;
