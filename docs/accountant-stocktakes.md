# Accountant device stocktakes

Private workspace: `/stocktakes`. Assign the native **ACCOUNTANT / محاسب** role from Settings → Team, either by invitation or by changing another member's role. Only active accountants in the current shop can list, open, scan, close, print, or export a stocktake. Owners and admins manage the role but cannot open this private workspace. Legacy sales access profiles do not override the native accountant role.

Each session snapshots available individual devices (`isDevice=true`, one barcode per unit), scoped to all/new/used/refurbished. The snapshot retains model, condition, purchase cost (six decimals), configured sale price, quantity and version. Parts and bulk products are outside this workflow.

Scanner input is always text, preserving leading zeros and long codes. Enter submits one scan. Duplicate scans warn without counting twice; explicit recount replaces the count anchor. Unknown, ambiguous and out-of-scope codes are logged separately for review. New arrivals and devices found physically with zero recorded stock require review until reconciled.

Sales and returns are reconciled using inventory movement IDs visible at the last scan, rather than transaction timestamps. Unscanned devices that leave stock are not marked missing. Devices added or changed during the session require a scan/review. This workflow never updates InventoryItem or inserts InventoryMovement records.

Closing freezes classifications and prices. A closed session cannot be rescanned or reopened. Reports include counted devices, missing devices, all devices and review cases. The counted report includes every scanned device with its final classification, including devices subsequently sold or requiring review. Totals exclude devices that left stock and explicitly identify missing prices/costs. Printing supports A4 landscape; Excel SpreadsheetML exports retain barcodes as string cells. Historical unknown scan attempts remain in the review audit (latest 500 shown/exported). The session list shows the latest 100 sessions; each session's device reports include every line.

## Release preparation

Apply `prisma/migrations/20261029210000_accountant_stocktakes/migration.sql` through the normal reviewed migration process **before** releasing code that uses the new role/tables. It adds an enum value, three session/audit tables, constraints, indexes and server-only RLS. No runtime schema creation is used for this feature. The migration is prepared in GitHub; it has not been applied to the live database. Vercel Git deployment remains disabled; publishing requires the user's explicit instruction.

## Verification

- `npm run build`
- `npm run devices:test`
- `npm run sales:cost-test`
- `PGLITE_MODULE_PATH=/absolute/path/to/@electric-sql/pglite/dist/index.js npm run stocktakes:test`

The stocktake integration test creates an isolated PostgreSQL-compatible database, applies the actual migration, and executes the actual service SQL through a Prisma transaction bridge. It checks role and tenant isolation, revoked memberships, duplicate/recount handling, movement reconciliation (including deliberately old movement timestamps), missing costs, frozen reports, exact barcode export, six-decimal totals, no inventory side effects and default-deny RLS. It never uses a live database connection.
