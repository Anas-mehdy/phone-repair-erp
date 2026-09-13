import type { ReactNode } from "react";
import { can, requirePermission } from "@/lib/auth/context";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { CashDrawerPanel } from "./_cash-drawer-panel";
import "./transfers-position.css";
import "./dark-mode-preview-transfers.css";

export default async function TransfersLayout({ children }: { children: ReactNode }) {
  const auth = await requirePermission("reports:read");
  const wallets = await financialTransferService.listWallets(auth.shop.id);
  const drawer = await cashDrawerService.getSnapshot(auth.shop.id);

  return (
    <div className="transfers-workspace space-y-6">
      {children}
      <CashDrawerPanel
        drawer={drawer}
        wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name }))}
        currency={auth.shop.currency || "SAR"}
        canManage={can(auth, "expenses:manage")}
      />
    </div>
  );
}
