# MVP Manual Testing Checklist

Use this checklist after running database migration and seed:

```bash
npx prisma migrate dev
npm run db:seed
```

## Repair Orders

1. Create a new repair order from `/repair-orders/new`.
2. Confirm it appears in `/repair-orders`.
3. Open the repair order details page.
4. Update the status from `PENDING` to another status.
5. Confirm the current status changes and the timeline shows the transition.
6. Change status to `DONE` and confirm it appears as ready for delivery on the dashboard.

## Inventory

1. Create a new inventory item from `/inventory/new`.
2. Use an opening quantity greater than zero.
3. Confirm an opening `STOCK_IN` movement is created.
4. Open the item details page.
5. Add stock and confirm quantity increases.
6. Adjust stock and confirm an `ADJUSTMENT` movement is created.

## Sales

1. Create a sale from `/sales/new`.
2. Add one inventory-linked line item.
3. Add one manual service line.
4. Confirm inventory quantity decreases for the inventory item only.
5. Open the sale details page.
6. Cancel the sale and confirm inventory is restored with `RETURN` movements.

## Invoices And Payments

1. Create an invoice from a repair order with an amount.
2. Create an invoice from a sale.
3. Open invoice details.
4. Add a partial payment.
5. Confirm status changes to partially paid.
6. Add the remaining payment.
7. Confirm status changes to paid and balance due becomes zero.
8. Try voiding an invoice with payments and confirm it is blocked.

## WhatsApp Links

1. Add a customer phone number to a repair or sale flow.
2. Open an invoice, repair order, or sale details page.
3. Click the WhatsApp share button.
4. Confirm WhatsApp opens with a prefilled Arabic message.
5. Test a record with no customer phone and confirm a friendly message appears.

## Dashboard

1. Confirm open repair orders count updates.
2. Confirm ready-for-delivery count updates when repair status is `DONE`.
3. Confirm today's sales revenue changes after creating a completed sale.
4. Confirm unpaid invoice count and unpaid balance update after invoice/payment changes.
5. Confirm low-stock count updates when inventory quantity is at or below reorder level.
