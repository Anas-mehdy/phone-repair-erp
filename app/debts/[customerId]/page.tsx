import { requirePermission } from "@/lib/auth/context";
import { getCustomerDebtLedger } from "@/lib/services/debtLedgerService";
import { CustomerDebtLedger } from "./_customer-debt-ledger";

export const dynamic = "force-dynamic";

export default async function CustomerDebtPage({ params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requirePermission("debts:manage");
  const { customerId } = await params;
  const ledger = await getCustomerDebtLedger(customerId);

  return (
    <CustomerDebtLedger
      customer={ledger.customer}
      entries={ledger.entries.map((entry) => ({
        ...entry,
        occurredAt: entry.occurredAt.toISOString(),
        dueAt: entry.dueAt?.toISOString() ?? null,
      }))}
      balance={ledger.balance}
      currency={auth.shop.currency || "SAR"}
    />
  );
}
