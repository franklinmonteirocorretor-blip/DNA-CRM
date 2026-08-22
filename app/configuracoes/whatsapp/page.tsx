"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CrmNavigation } from "../../components/crm-navigation";
import "./whatsapp.css";
import "./settings-links.css";
import "./layout-fixes.css";

type Session = {
  id: string;
  status: string;
  connected_phone?: string;
  last_connected_at?: string;
  last_activity_at?: string;
  heartbeat_at?: string;
  failure_reason?: string;
  reconnect_attempts?: number;
  circuit_state?: string;
};
const labels: Record<string, string> = {
  created: "Criada",
  waiting_qr: "Aguardando leitura do QR",
  connecting: "Conectando",
  connected: "Conectada",
  reconnecting: "Reconectando",
  disconnected: "Desconectada",
  failed: "Falha",
  logged_out: "Sessão invalidada",
};
const fmt = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Não registrada";

export default function WhatsAppSettingsPage() {
  const [session, setSession] = useState<Session | null>(null),
    [configured, setConfigured] = useState(false),
    [qr, setQr] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/agent/whatsapp/session", { cache: "no-store" }),
      d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "Gateway indisponível.");
      return;
    }
    setConfigured(Boolean(d.configured));
    setSession(d.session);
    if (d.session?.status === "waiting_qr") {
      const q = await fetch("/api/agent/whatsapp/session?action=qr", {
          cache: "no-store",
        }),
        j = await q.json();
      setQr(q.ok ? j.dataUrl : "");
    } else setQr("");
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  async function act(
    action: "create" | "connect" | "disconnect" | "reconnect" | "logout",
  ) {
    setBusy(true);
    setMessage("");
    const r = await fetch("/api/agent/whatsapp/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      }),
      d = await r.json();
    setMessage(
      r.ok
        ? "Ação confirmada pelo gateway e relida no banco."
        : d.error || "Falha na ação.",
    );
    await load();
    setBusy(false);
  }
  return (
    <main className="wa-shell">
      <aside className="wa-sidebar">
        <div className="wa-brand">
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro CRM"
            width={58}
            height={64}
          />
          <b>MONTEIRO</b>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="wa-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="wa-main">
        <header className="wa-header">
          <div>
            <span>Configurações / WhatsApp</span>
            <h1>Conexão do Agente Comercial</h1>
            <p>Gateway durável, sessão protegida e outbound real bloqueado.</p>
            <nav className="wa-settings-links" aria-label="Configurações do agente comercial">
              <Link href="/configuracoes/agente">Cérebro Comercial</Link>
              <Link href="/configuracoes/whatsapp/abordagens">Abordagens e cadências</Link>
            </nav>
          </div>
          <div className={`wa-status ${session?.status || "offline"}`}>
            <small>Estado atual</small>
            <b>
              {session
                ? labels[session.status] || session.status
                : "Sem sessão"}
            </b>
          </div>
        </header>
        <div className="wa-content">
          <section className="wa-actions">
            <div>
              <span>Operação protegida</span>
              <h2>WhatsApp Gateway</h2>
              <p>
                Simulation Mode ativo. Nenhuma mensagem real sai nesta fase.
              </p>
            </div>
            <div>
              {!session && (
                <button
                  disabled={busy || !configured}
                  onClick={() => act("create")}
                >
                  Criar e conectar
                </button>
              )}
              {session &&
                ["created", "disconnected", "failed"].includes(
                  session.status,
                ) && (
                  <button disabled={busy} onClick={() => act("connect")}>
                    Conectar
                  </button>
                )}
              {session && (
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => act("reconnect")}
                >
                  Reconectar
                </button>
              )}
              {session &&
                !["disconnected", "failed", "logged_out"].includes(
                  session.status,
                ) && (
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => act("disconnect")}
                  >
                    Desconectar
                  </button>
                )}
              {session && session.status !== "logged_out" && (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    window.confirm("Invalidar a sessão e exigir novo QR?") &&
                    act("logout")
                  }
                >
                  Invalidar sessão
                </button>
              )}
            </div>
          </section>
          {message && <div className="wa-message">{message}</div>}
          <section className="wa-grid">
            <article>
              <span>Sessão e atividade</span>
              <dl>
                {[
                  [
                    "Telefone conectado",
                    session?.connected_phone || "Não conectado",
                  ],
                  ["Última conexão", fmt(session?.last_connected_at)],
                  ["Última atividade", fmt(session?.last_activity_at)],
                  ["Heartbeat", fmt(session?.heartbeat_at)],
                  ["Reconexões", String(session?.reconnect_attempts || 0)],
                  ["Circuit breaker", session?.circuit_state || "closed"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {session?.failure_reason && (
                <div className="wa-error">
                  <b>Último erro</b>
                  <p>{session.failure_reason}</p>
                </div>
              )}
            </article>
            <article className="wa-qr">
              <span>Vincular aparelho</span>
              {qr ? (
                <>
                  <div className="wa-qr-frame">
                    <Image
                      src={qr}
                      alt="QR Code WhatsApp"
                      width={300}
                      height={300}
                      unoptimized
                    />
                  </div>
                  <b>Leia em Aparelhos conectados</b>
                  <p>QR não é persistido no banco.</p>
                </>
              ) : (
                <div className="wa-qr-empty">
                  <Image
                    src="/whatsapp.svg"
                    alt="WhatsApp"
                    width={42}
                    height={42}
                  />
                  <b>
                    {session?.status === "connected"
                      ? "Aparelho conectado"
                      : "QR ainda não disponível"}
                  </b>
                  <p>Use Conectar ou Reconectar.</p>
                </div>
              )}
            </article>
          </section>
          <section className="wa-safety">
            <div>
              <span>Modo</span>
              <b>SIMULATION</b>
              <small>Outbound real OFF</small>
            </div>
            <div>
              <span>Controle</span>
              <b>AUTO / TAKEOVER</b>
              <small>Inbound continua registrado</small>
            </div>
            <div>
              <span>Recuperação</span>
              <b>HEALTH + CIRCUIT</b>
              <small>Backoff e limite ativos</small>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
