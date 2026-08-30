# Partner / Reseller Phase 2 — Wholesale Pricing

## Commercial rule

Massar does not track the retail price charged by a partner to the partner's customer.
Massar only calculates the amount the partner owes Massar for a subscription activation.

## Authoritative inputs

A wholesale quote is derived server-side from:

1. the shop's `countryCode`;
2. the canonical `SubscriptionPrice` row for the `PROFESSIONAL` plan and requested billing interval;
3. the partner's stored `discountPercent`.

The client must never supply a base subscription price, wholesale payable amount, or partner discount percentage.

## Country pricing fallback

For the selected billing interval, use the shop-country price first. If it does not exist, use the `ZZ` fallback price. If neither exists, reject the quote.

## Calculation

`discountAmount = baseAmount * discountPercent / 100`

`payableAmount = baseAmount - discountAmount`

Money values are rounded to two decimal places and never allowed to become negative.

## Eligibility rules

A wholesale quote is allowed only when:

- the shop exists and is active;
- the shop is durably assigned to the requested partner;
- the partner exists and is not soft-deleted;
- the partner status is `ACTIVE`;
- a canonical price exists for the requested interval.

## Direct-price confidentiality

Any shop with a non-null `Shop.partnerId` is partner-managed:

- the direct `اشتراكي` navigation item is hidden;
- `/subscription` never shows Massar direct prices or the Founders Offer;
- direct pricing stays hidden based on the durable shop attribution even if partner metadata later becomes unavailable.

## Historical snapshots

Phase 2 quotes are not accounting records and do not activate subscriptions.

Phase 3 activation requests must persist the quote snapshot at request/approval time, including at minimum:

- base price;
- price-source country code;
- billing interval;
- currency;
- partner discount percentage;
- discount amount;
- final payable amount.

Changing a partner discount or a country subscription price later must not rewrite historical activation-request snapshots.

## Authorization

During the initial reseller rollout, wholesale quote generation and subscription activation remain Super Admin-only. Partner self-activation is explicitly out of scope.
