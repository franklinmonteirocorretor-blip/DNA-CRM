export function calculateClosingValues(input: {
  listedPrice: number;
  negotiatedPrice: number;
  financing: number;
  subsidy: number;
  fixedEntryItems?: number[];
}) {
  const listedPrice = Math.max(0, Number(input.listedPrice) || 0);
  const negotiatedPrice = Math.max(0, Number(input.negotiatedPrice) || 0);
  const financing = Math.max(0, Number(input.financing) || 0);
  const subsidy = Math.max(0, Number(input.subsidy) || 0);
  const bonus = Math.max(0, negotiatedPrice - listedPrice);
  const netPropertyValue = Math.max(0, listedPrice - bonus);
  const entryRequired = Math.max(0, netPropertyValue - financing - subsidy);
  const fixedEntryDistribution = (input.fixedEntryItems || []).reduce(
    (total, value) => total + Math.max(0, Number(value) || 0),
    0,
  );

  return {
    bonus,
    netPropertyValue,
    entryRequired,
    fixedEntryDistribution,
    monthlyTotal: Math.max(0, entryRequired - fixedEntryDistribution),
    vgv: listedPrice,
  };
}
