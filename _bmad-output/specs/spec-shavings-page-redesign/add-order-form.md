# Add-Order Form with Mandatory Ranch (#32)

Grounds CAP-5. Mirrors the mobile admin add-order flow, adds an explicit **required Ranch dropdown**
that scopes the stall picker and the price. Backend already exists and is deployed; this is a web form
+ web-service wiring only.

## Backend path — confirmed deployed (no proc/BL work for #32)

- `POST /api/ShavingsOrders` → `ShavingsOrdersController.CreateShavingsOrder` authorizes
  `EnsureUserHasAnyRoleInRanch(personId, request.RanchId, RanchAdmin, HostSecretary)` — **HostSecretary
  is permitted**; the server overrides `OrderedBySystemUserId` from the token. Backing proc
  `usp_createshavingsorder` (#169) takes `p_ranchid` + `p_stalls` jsonb.
- `GET /api/ShavingsOrders/stall-bookings-for-order?competitionId&ranchId` →
  `GetStallBookingsForShavings`, same `HostSecretary`-permitted auth; backing proc
  `usp_getstallbookingsforshavings` (#177) excludes tack stalls and cancelled change-requests.

So #32 needs **web-side work only**: the form + three web-service functions
(`createShavingsOrder`, `getStallBookingsForShavings`, and the price read below).

## The required Ranch dropdown (the #32 delta vs mobile)

On mobile, ranch is implicit (`activeRole.ranchId`). On web the secretary picks a ranch **explicitly
and mandatorily**, because the same ranch value drives three coupled reads/validations:

1. **Stalls** — `getStallBookingsForShavings(competitionId, ranchId)` filters `sb.ranchid = ranchId`;
   the stall list refetches and resets whenever the ranch changes.
2. **Price** — `getServicePricesDashboard(ranchId)` (see below) is ranch-scoped; the create proc
   rejects a price whose `pricecatalog.ranchid ≠ p_ranchid`.
3. **Auth + write** — `ranchId` is sent in the payload and is what the create endpoint authorizes.

**Options set:** participating ranches (the ranch the horse/stall booking is attributed to) that have
**both** pickable stalls in this competition **and** an active shavings price. On live data only the
host ranch (Double K / 11) is priced, so the set is effectively the host ranch today (confirm scope —
SPEC.md Open Question). Even when the set is a single ranch, the dropdown is shown and its selection is
required (no silent auto-submit ranch).

**Validation:** empty ranch blocks submit with `"יש לבחור חווה"` (see `hebrew-labels.md`).

## Price source (RESOLVED — web equivalent of mobile's invitation-details read)

Use `getServicePricesDashboard(ranchId)` (`GET /ServicePrices?ranchId`) from
`web/src/services/servicePricesService.js`, and pick the **shavings** (`נסורת`) section — the same
dashboard `SecretaryCreateStallBookingModal` already uses to load the *stalls* section. From that
section take the active shavings price(s) → `priceCatalogId` + `itemPrice`. Auto-select when exactly
one active shavings price exists (mirrors the mobile hook).

## Fields mirrored from mobile (`useAdminCompetitionShavings` + `CompetitionShavingsTab`)

| Field | Behaviour | Source |
|---|---|---|
| **Ranch** (new, required) | dropdown; scopes stalls + price; resets stall selection on change | option set above |
| Price catalog | dropdown of shavings prices; auto-select when exactly one active | `getServicePricesDashboard(ranchId)` → נסורת section |
| Delivery mode | now / later toggle; `later` requires date + time | form state |
| Bag quantity mode | equal-per-stall vs per-stall | form state |
| Bag quantity | equal value, or a value per selected stall (> 0) | form state |
| Stalls | multi-select from the ranch's pickable stalls; each shows horse + compound/stall | `getStallBookingsForShavings` |
| Notes | optional free text | form state |
| Totals | derived total bags + total price (bags × itemPrice) | derived |

## Submit payload (same shape as mobile)

```json
{
  "competitionId": <int>,
  "priceCatalogId": <int>,
  "ranchId": <int, REQUIRED, from the dropdown>,
  "notes": <string|null>,
  "requestedDeliveryTime": "YYYY-MM-DDTHH:mm:ss",
  "stalls": [ { "stallBookingId": <int>, "bagQuantity": <int > 0> } ]
}
```

`orderedBySystemUserId` may be omitted — the server overrides it from the token. On success: close the
modal, reload the order list, surface `"הזמנת הנסורת נוספה בהצלחה"`. On failure:
`getErrorMessage(error, "אירעה שגיאה ביצירת הזמנת הנסורת")`.

## Client-side validation (mirror mobile `validateForm`, plus ranch)

Ranch selected; price selected; ≥1 stall; positive bag quantity in the active mode; `later` mode has
both date and time. Messages in Hebrew per `hebrew-labels.md`.

## Not this

- **Not** a new create endpoint or BL method — the controller path exists and authorizes HostSecretary.
- **Not** the mobile RN modal reused — web reuses the summary visual language + Tailwind, mirroring the
  *flow and field semantics*, not the RN components.
- **Not** silently defaulting the ranch — an explicit required choice even when one option exists.
- **Not** ordering for an unpriced participating ranch — blocked by the create proc; out of scope.
