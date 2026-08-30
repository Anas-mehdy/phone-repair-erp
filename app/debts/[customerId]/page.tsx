import { requirePermission } from "@/lib/auth/context";
import { getCustomerDebtLedger } from "@/lib/services/debtLedgerService";
import { paymentSourceService } from "@/lib/services/paymentSourceService";
import { CustomerDebtLedger } from "./_customer-debt-ledger";

export const dynamic = "force-dynamic";

export default async function CustomerDebtPage({ params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requirePermission("debts:manage");
  const { customerId } = await params;
  const [ledger, paymentSources] = await Promise.all([
    getCustomerDebtLedger(customerId),
    paymentSourceService.listPaymentSourceOptions(auth.shop.id),
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
      balance={ledger.balance}
      currency={auth.shop.currency || "SAR"}
    />
  );
}
