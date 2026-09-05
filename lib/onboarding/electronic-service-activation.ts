export function parseElectronicMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function canExecuteFirstElectronicService(providerBalance: number, providerCost: number) {
  const balance = Math.max(0, Number(providerBalance) || 0);
  const cost = Math.max(0, Number(providerCost) || 0);
  return cost > 0 && cost <= balance;
}

export function providerBalanceAfterService(providerBalance: number, providerCost: number) {
  const balance = Math.max(0, Number(providerBalance) || 0);
  const cost = Math.max(0, Number(providerCost) || 0);
  return Math.max(0, balance - cost);
}

export function electronicServiceProfit(providerCost: number, customerCharge: number) {
  const cost = Math.max(0, Number(providerCost) || 0);
  const charge = Math.max(0, Number(customerCharge) || 0);
  return Math.round((charge - cost) * 100) / 100;
}
