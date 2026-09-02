import { requirePermission } from "@/lib/auth/context";
import { getCustomerDebtLedger } from "@/lib/services/debtLedgerService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { paymentSourceService } from "@/lib/services/paymentSourceService";
import { CustomerDebtLedger } from "./_customer-debt-ledger";

export const dynamic = "force-dynamic";

export default async function CustomerDebtPage({ params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requirePermission("debts:manage");
  const { customerId } = await params;
  const [ledger, paymentSources, wallets] = await Promise.all([
    getCustomerDebtLedger(customerId),
    paymentSourceService.listPaymentSourceOptions(auth.shop.id),
    financialTransferService.listWallets(auth.shop.id),
  ]);

  return (
    <CustomerDebtLedger
      customer={ledger.customer}
      entries={ledger.entries.map((entry) => ({
        ...entry,
        occurredAt: entry.occurredAt.toISOString(),
        dueAt: entry.dueAt?.toISOString() ?? null,
      }))}
      paymentSources={paymentSources}
      wallets={wallets.map((wallet) => ({
        id: wallet.id,
        name: wallet.name,
        currentBalance: Number(wallet.currentBalance),
      }))}
      balance={ledger.balance}
      currency={auth.shop.currency || "SAR"}
    />
  );
}
