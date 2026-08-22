"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const dailyMissionRoutes = ["/", "/follow-ups", "/carteira", "/agenda"];

const centers = [
  [
    "▽",
    "Jornada do Cliente",
    "/funil",
    ["/funil", "/analises", "/fechamento", "/pos-venda"],
  ],
  ["○", "Central de Clientes", "/clientes", ["/clientes", "/bases"]],
  ["⌂", "Parceiros de Trabalho", "/construtoras", ["/construtoras", "/ccas"]],
  [
    "◫",
    "Central de Resultados",
    "/indicadores",
    ["/indicadores", "/financeiro"],
  ],
] as const;

export function CrmNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const dailyMissionActive = dailyMissionRoutes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Falha ao encerrar sessão");
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav className="crm-navigation" aria-label="Centrais do Monteiro CRM">
      <Link
        aria-current={dailyMissionActive ? "page" : undefined}
        className={dailyMissionActive ? "active" : undefined}
        href="/"
      >
        <i aria-hidden="true">◉</i>
        <span>Missão Diária</span>
      </Link>
      {centers.map(([icon, label, href, routes]) => {
        const active = routes.some((route) => pathname.startsWith(route));
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : undefined}
            href={href}
            key={href}
          >
            <i aria-hidden="true">{icon}</i>
            <span>{label}</span>
          </Link>
        );
      })}
      <div className="crm-nav-group">
        <div className={`crm-nav-group-title ${pathname.startsWith("/configuracoes") ? "active" : ""}`}>
          <i aria-hidden="true">⚙</i>
          <span>Configurações</span>
        </div>
        <div className="crm-nav-group-links">
          <Link aria-current={pathname === "/configuracoes/whatsapp" ? "page" : undefined} className={pathname === "/configuracoes/whatsapp" ? "active" : undefined} href="/configuracoes/whatsapp">
            <small aria-hidden="true">01</small>
            <i aria-hidden="true">◉</i>
            <span>WhatsApp</span>
          </Link>
          <Link aria-current={pathname === "/configuracoes/agente" ? "page" : undefined} className={pathname === "/configuracoes/agente" ? "active" : undefined} href="/configuracoes/agente">
            <small aria-hidden="true">02</small>
            <i aria-hidden="true">◇</i>
            <span>Agente Comercial</span>
          </Link>
          <Link aria-current={pathname === "/configuracoes/whatsapp/abordagens" ? "page" : undefined} className={pathname === "/configuracoes/whatsapp/abordagens" ? "active" : undefined} href="/configuracoes/whatsapp/abordagens">
            <small aria-hidden="true">03</small>
            <i aria-hidden="true">≡</i>
            <span>Abordagens</span>
          </Link>
        </div>
      </div>
      <button
        aria-label="Sair do Monteiro CRM"
        className="crm-logout"
        disabled={loggingOut}
        onClick={logout}
        type="button"
      >
        <i aria-hidden="true">↪</i>
        <span>{loggingOut ? "Saindo..." : "Sair do CRM"}</span>
      </button>
    </nav>
  );
}
