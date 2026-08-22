"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  ["Dashboard", "/"],
  ["Follow-Ups", "/follow-ups"],
  ["Carteira do Dia", "/carteira"],
  ["Agenda", "/agenda"],
] as const;

export function DailyMissionTabs() {
  const pathname = usePathname();
  return (
    <nav className="daily-mission-tabs" aria-label="Telas da Missão Diária">
      {tabs.map(([label, href]) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            className={active ? "active" : undefined}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
