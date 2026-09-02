import type { ReactNode } from "react";
import { getCurrentShopContext } from "@/lib/current-shop";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { CashDrawerPanel } from "./_cash-drawer-panel";
import "./transfers-position.css";

export default async function TransfersLayout({ children }: { children: ReactNode }) {
  const context = await getCurrentShopContext();
  const [drawer, wallets] = await Promise.all([
    cashDrawerService.getSnapshot(context.shopId),
    financialTransferService.listWallets(context.shopId),
  ]);

  return (
    <div className="space-y-6">
      {children}
      <CashDrawerPanel
        drawer={drawer}
        wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name }))}
        currency={context.currency || "SAR"}
      />
    </div>
  );
}
