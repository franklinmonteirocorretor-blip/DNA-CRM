"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const centers = [
  ["⌂", "Dashboard", "/"],
  ["◎", "Carteira do Dia", "/carteira"],
  ["↻", "Follow-ups", "/follow-ups"],
  ["▽", "Funil", "/funil"],
  ["▣", "Agenda", "/agenda"],
  ["◇", "Análises", "/analises"],
  ["◆", "Mesa de Fechamento", "/fechamento"],
  ["▥", "VGV e Comissões", "/financeiro"],
  ["♢", "Pós-venda", "/pos-venda"],
  ["▤", "Central de Bases", "/bases"],
  ["○", "Todos os Clientes", "/clientes"],
  ["⌂", "Construtoras", "/construtoras"],
  ["▦", "Central de CCA", "/ccas"],
  ["◫", "Indicadores", "/indicadores"],
] as const;

export function CrmNavigation() {
  const pathname = usePathname();

  return (
    <nav className="crm-navigation" aria-label="Centrais do Monteiro CRM">
      {centers.map(([icon, label, href]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link className={active ? "active" : undefined} href={href} key={href}>
            <i aria-hidden="true">{icon}</i>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
