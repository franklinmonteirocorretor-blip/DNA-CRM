"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const centers = [
  {
    label: "Jornada do Cliente",
    routes: [
      ["Funil", "/funil"],
      ["Análise", "/analises"],
      ["Mesa de Fechamento", "/fechamento"],
      ["Pós-Venda", "/pos-venda"],
    ],
  },
  {
    label: "Central de Clientes",
    routes: [
      ["Todos os Clientes", "/clientes"],
      ["Central de Bases", "/bases"],
    ],
  },
  {
    label: "Parceiros de Trabalho",
    routes: [
      ["Construtores", "/construtoras"],
      ["CCAs", "/ccas"],
    ],
  },
  {
    label: "Central de Resultados",
    routes: [
      ["Indicadores", "/indicadores"],
      ["VGV e Comissões", "/financeiro"],
    ],
  },
] as const;

export function CrmCenterTabs() {
  const pathname = usePathname();
  const center = centers.find((item) =>
    item.routes.some(([, href]) => pathname.startsWith(href)),
  );
  if (!center) return null;
  return (
    <section className="crm-center-switcher">
      <span>{center.label}</span>
      <nav aria-label={`Telas de ${center.label}`}>
        {center.routes.map(([label, href]) => (
          <Link
            className={pathname.startsWith(href) ? "active" : undefined}
            href={href}
            key={href}
          >
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
