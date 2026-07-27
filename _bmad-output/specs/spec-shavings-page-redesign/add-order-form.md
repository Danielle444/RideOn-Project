# Add-Order Form with Mandatory Ranch (#32)

Grounds CAP-5. Mirrors the mobile admin add-order flow, adds an explicit **required Ranch dropdown**
that scopes the stall picker. Backend already exists; this is a web form + web-service wiring.

## Backend path — confirmed to exist (no proc/BL work for #32)

- `POST /api/ShavingsOrders` → `ShavingsOrdersController.CreateShavingsOrder` authorizes
  `EnsureUserHasAnyRoleInRanch(personId, request.RanchId, RanchAdmin, HostSecretary)` — **HostSecretary
  is already permitted**; it overwrites `OrderedBySystemUserId` from the token. Backing proc
  `usp_createshavingsorder` (#169) takes `p_ranchid` + `p_stalls` jsonb.
- `GET /api/ShavingsOrders/stall-bookings-for-order?competitionId&ranchId` →
  `GetStallBookingsForShavings`, same `HostSecretary`-permitted auth; backing proc
  `usp_getstallbookingsforshavings` (#177) already excludes tack stalls and cancelled change-requests.

So #32 needs **web-side work only**: the form + the two web-service functions (`createShavingsOrder`,
`getStallBookingsForShavings`) added in `shavingsOrderService.js` (see `component-structure.md`).

## The required Ranch dropdown (the #32 delta vs mobile)

On mobile, ranch is implicit (`activeRole.ranchId`). On web the secretary must pick a ranch
**explicitly and mandatorily**, because the ranch:

1. scopes which stalls are pickable — `getStallBookingsForShavings(competitionId, ranchId)` is
   (re)fetched whenever the ranch changes; the stall list resets on ranch change;
2. is sent as `ranchId` in the create payload and is what the create endpoint authorizes against;
3. must match the price-catalog's ranch (the proc rejects a cross-ranch price).

**Options set:** ranches the secretary is authorized for (HostSecretary in that ranch, matching the
create-endpoint auth) that have pickable stalls. On live data this is only the host ranch (see Open
Question in SPEC.md — confirm host-only vs any booking ranch). Even when the set is a single ranch,
the dropdown is shown and its selection is required (no silent auto-submit ranch).

**Validation:** empty ranch blocks submit with a Hebrew message, e.g. `"יש לבחור חווה"`, surfaced the
same way as the mobile form's alerts / the class-form toast convention.

## Fields mirrored from mobile (`useAdminCompetitionShavings` + `CompetitionShavingsTab`)

| Field | Behaviour | Source of truth |
|---|---|---|
| **Ranch** (new, required) | dropdown; scopes stalls; resets stall selection on change | option set above |
| Price catalog | dropdown of shavings prices; auto-select when exactly one active | web price read — see Open Question |
| Delivery mode | now / later toggle; `later` requires date + time | `deliveryMode` |
| Bag quantity mode | equal-per-stall vs per-stall | `quantityMode` |
| Bag quantity | equal value, or a value per selected stall (> 0) | `equalBagQuantity` / per-stall |
| Stalls | multi-select from the ranch's pickable stalls; each shows horse + compound/stall | `getStallBookingsForShavings` |
| Notes | optional free text | `notes` |
| Totals | derived total bags + total price (bags × itemPrice) | derived |

## Submit payload (unchanged shape from mobile)

```json
{
  "competitionId": <int>,
  "orderedBySystemUserId": <ignored; server overrides from token>,
  "priceCatalogId": <int>,
  "ranchId": <int, REQUIRED, from the dropdown>,
  "notes": <string|null>,
  "requestedDeliveryTime": "YYYY-MM-DDTHH:mm:ss",
  "stalls": [ { "stallBookingId": <int>, "bagQuantity": <int > 0> } ]
}
```

On success: close the modal, reload the order list (`useCompetitionShavingsPage.reload()`), and the
new order appears. On failure: surface `getErrorMessage(error, "אירעה שגיאה ביצירת הזמנת הנסורת")`.

## Client-side validation (mirror mobile `validateForm`, plus ranch)

- ranch selected; price selected; ≥1 stall selected; positive bag quantity in the active mode;
  `later` mode has both date and time. All messages in Hebrew, consistent with the app's toast/alert
  convention.

## Not this

- **Not** a new create endpoint or BL method — the controller path exists and authorizes HostSecretary.
- **Not** the mobile modal reused — mobile is React Native; web reuses the summary visual language and
  Tailwind, mirroring the *flow and field semantics*, not the RN components.
- **Not** silently defaulting the ranch — it is an explicit required choice even when one option exists.
