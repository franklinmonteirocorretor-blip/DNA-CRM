import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { SessionManager } from "./session-manager.js";

const sessions = new SessionManager();
const startedAt = Date.now();
let gatewayReady = false;
let startupError: string | null = null;
const json = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };
const authorized = (req: IncomingMessage) => { const supplied = Buffer.from((req.headers.authorization || "").replace(/^Bearer\s+/i, "")); const expected = Buffer.from(config.gatewaySecret); return supplied.length === expected.length && timingSafeEqual(supplied, expected); };
const body = async (req: IncomingMessage) => { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); if (Buffer.concat(chunks).length > 16_384) throw new Error("Payload excede limite."); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://gateway.local");
    if (req.method === "GET" && url.pathname === "/health") {
      const memory = process.memoryUsage();
      const operational = authorized(req) ? await sessions.healthSnapshot() : undefined;
      return json(res, gatewayReady ? 200 : 503, {
        ok: gatewayReady,
        service: "monteiro-whatsapp-gateway",
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        outboundReal: config.realOutboundEnabled,
        memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
        ...(operational ? { operational, startupError } : {}),
      });
    }
    if (!authorized(req)) return json(res, 401, { error: "Não autorizado." });
    if (req.method === "POST" && url.pathname === "/sessions") { const input = await body(req) as { userId?: string }; if (!input.userId) return json(res, 400, { error: "userId obrigatório." }); return json(res, 201, await sessions.create(input.userId)); }
    const match = url.pathname.match(/^\/sessions\/([0-9a-f-]+)(?:\/(connect|disconnect|reconnect|logout|qr|messages))?$/i);
    if (!match) return json(res, 404, { error: "Rota não encontrada." });
    const id = match[1]!; const action = match[2];
    if (req.method === "GET" && !action) return json(res, 200, await sessions.status(id));
    if (req.method === "GET" && action === "qr") return json(res, 200, sessions.qr(id));
    if (req.method === "POST" && action === "connect") return json(res, 202, await sessions.connect(id));
    if (req.method === "POST" && action === "disconnect") return json(res, 200, await sessions.disconnect(id));
    if (req.method === "POST" && action === "reconnect") return json(res, 202, await sessions.reconnect(id));
    if (req.method === "POST" && action === "logout") return json(res, 200, await sessions.logout(id));
    if (req.method === "POST" && action === "messages") { const input = await body(req) as { phone?: string; text?: string }; if (!input.phone || !input.text) return json(res, 400, { error: "phone e text obrigatórios." }); return json(res, 202, await sessions.sendText(id, input.phone, input.text)); }
    return json(res, 405, { error: "Método não permitido." });
  } catch (error) { console.error(JSON.stringify({ level: "error", event: "request_failed", message: error instanceof Error ? error.message.replace(/[A-Za-z0-9+/=]{24,}/g, "[redacted]") : "unknown" })); return json(res, 500, { error: "Falha interna do gateway." }); }
});

const heartbeatTimer = setInterval(() => {
  void sessions.heartbeat().catch(error => console.error(JSON.stringify({ level: "error", event: "gateway_heartbeat_failed", message: error instanceof Error ? error.message : "unknown" })));
}, 30_000);
heartbeatTimer.unref();
await sessions.restoreActiveSessions()
  .then(() => { gatewayReady = true; })
  .catch(error => {
    startupError = error instanceof Error ? error.message : "unknown";
    console.error(JSON.stringify({ level: "error", event: "gateway_restore_failed", message: startupError }));
  });
server.listen(config.port, "0.0.0.0", () => console.log(JSON.stringify({ level: "info", event: "gateway_ready", port: config.port, outboundReal: config.realOutboundEnabled })));

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeatTimer);
  console.log(JSON.stringify({ level: "info", event: "gateway_shutdown_started", signal }));
  server.close();
  const forcedExit = setTimeout(() => process.exit(1), 25_000);
  forcedExit.unref();
  await sessions.shutdown();
  server.closeAllConnections();
  clearTimeout(forcedExit);
  console.log(JSON.stringify({ level: "info", event: "gateway_shutdown_complete", signal }));
  process.exit(0);
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT", () => { void shutdown("SIGINT"); });
