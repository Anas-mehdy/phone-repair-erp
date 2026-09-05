export type WalletQuickOperation = "WALLET_TOPUP" | "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL";

export function walletOperationDirection(operation: WalletQuickOperation): "IN" | "OUT" {
  return operation === "CUSTOMER_DEPOSIT" ? "OUT" : "IN";
}

export function walletBalanceAfter(input: {
  balance: number;
  amount: number;
  operation: WalletQuickOperation;
}) {
  const balance = Number.isFinite(input.balance) ? Math.max(0, input.balance) : 0;
  const amount = Number.isFinite(input.amount) ? Math.max(0, input.amount) : 0;
  return walletOperationDirection(input.operation) === "OUT"
    ? Math.max(0, balance - amount)
    : balance + amount;
}

export function canSubmitWalletQuickTransfer(input: {
  balance: number;
  amount: number;
  operation: WalletQuickOperation;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return false;
  if (walletOperationDirection(input.operation) === "OUT" && input.amount > input.balance) return false;
  return true;
}
