# Partner / Reseller Foundation — Phase 1

This phase establishes the commercial reseller foundation only.

## Included
- Partner identity with `AGENT` / `DISTRIBUTOR` types.
- `ACTIVE` / `SUSPENDED` lifecycle.
- Case-insensitive unique partner code.
- Optional partner country and contact information.
- Base reseller discount percentage (0–100%).
- Optional durable attribution from `Shop` to one `Partner`.
- `partnerAssignedAt` timestamp on shops.
- Super Admin-only backend service for partner CRUD/status and shop assignment/removal.

## Intentionally not included yet
- Partner login / portal.
- Partner-created shops or referral-link attribution.
- Partner activation requests.
- Partner authority to activate subscriptions.
- Wholesale settlement/payment workflow.
- Hiding direct subscription pricing from partner-managed shops (to be added before assigning real partner-managed customer shops).

## Operational rule
Until the subscription visibility guard is implemented in the later phase, do not assign production customer shops to partners. Existing shops remain direct (`partnerId = NULL`).
