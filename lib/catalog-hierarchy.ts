export const CATALOG_CITIES = [
  "Altos",
  "Demerval Lobão",
  "Teresina",
  "Timon",
] as const;

export type CatalogCity = (typeof CATALOG_CITIES)[number];

const plain = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

export function normalizeCatalogCity(
  value: unknown,
  region?: unknown,
): CatalogCity {
  const candidate = plain(value) || plain(region);
  if (candidate.includes("alto")) return "Altos";
  if (candidate.includes("demerval")) return "Demerval Lobão";
  if (candidate.includes("timon")) return "Timon";
  return "Teresina";
}

export function catalogCityRank(city: unknown) {
  const normalized = normalizeCatalogCity(city);
  return CATALOG_CITIES.indexOf(normalized);
}
