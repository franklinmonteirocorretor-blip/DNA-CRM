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
        className={
          dailyMissionRoutes.some((route) =>
            route === "/" ? pathname === "/" : pathname.startsWith(route),
          )
            ? "active"
            : undefined
        }
        href="/"
      >
        <i aria-hidden="true">◉</i>
        <span>Missão Diária</span>
      </Link>
      {centers.map(([icon, label, href, routes]) => {
        const active = routes.some((route) => pathname.startsWith(route));
        return (
          <Link
            className={active ? "active" : undefined}
            href={href}
            key={href}
          >
            <i aria-hidden="true">{icon}</i>
            <span>{label}</span>
          </Link>
        );
      })}
      <Link className={pathname.startsWith("/configuracoes") ? "active" : undefined} href="/configuracoes/whatsapp">
        <i aria-hidden="true">⚙</i>
        <span>Configurações</span>
      </Link>
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
