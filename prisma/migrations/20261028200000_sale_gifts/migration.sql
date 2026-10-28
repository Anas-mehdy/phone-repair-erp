-- All existing products remain ineligible for gifts. A nullable purchase-line
-- choice preserves the current product setting when it was not explicitly edited.
ALTER TABLE "InventoryItem" ADD COLUMN "giftAllowed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "PurchaseItem" ADD COLUMN "giftAllowed" BOOLEAN;
ALTER TABLE "SaleItem" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_gift_zero_amounts_check"
  CHECK (NOT "isGift" OR ("unitPriceSnapshot" = 0 AND "discountTotal" = 0 AND "lineTotal" = 0));
