"use client";

import { InputHTMLAttributes } from "react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export function CurrencyInput({ value, onValueChange, ...props }: BaseProps & { value: number; onValueChange: (value: number) => void }) {
  const change = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    onValueChange(digits ? Number(digits) / 100 : 0);
  };
  return <input {...props} className={`crm-currency-input ${props.className || ""}`} inputMode="numeric" value={currency.format(value || 0)} onChange={(event) => change(event.target.value)} onFocus={(event) => event.currentTarget.select()} />;
}

export function PercentageInput({ value, onValueChange, ...props }: BaseProps & { value: number; onValueChange: (value: number) => void }) {
  return <div className="crm-percentage-input"><input {...props} inputMode="decimal" value={String(value ?? 0).replace(".", ",")} onChange={(event) => onValueChange(Math.max(0, Number(event.target.value.replace(",", ".")) || 0))} onFocus={(event) => event.currentTarget.select()} /><span>%</span></div>;
}
