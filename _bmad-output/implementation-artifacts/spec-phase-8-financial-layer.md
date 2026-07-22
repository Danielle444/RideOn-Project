---
title: 'Phase 8 — Financial Layer of the Smart Element'
type: 'feature'
created: '2026-07-22'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '536de74'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/handoff-phase-8-financial-layer-planning.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-phase-7-schedule-math-and-counts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The secretary can forecast entry *counts* (Phase 6) and *timing* (Phase 7), but has no forecast of the *money* a competition will bring, and no way to know how many stalls to reserve or how many shavings bags to order weeks ahead. The only existing income figure — "סה״כ הכנסות צפויות" — is a single point that will collide with anything labelled a projection.

**Approach:** Add one greenfield page, three tabs mirroring the schedule view, that derives an income *projection* entirely at read time from the existing entry-count predictions plus config tables. Three separate, independently-labelled ranges — entry income · stall income · shavings income — each carrying its own assumption and its own width. Nothing is stored; every number is recomputed on read, exactly as the ± RMSE band already is. The chain is:

```
predicted entries → per-day horses → horse-days → unique competition horses → stalls (+ tack) → shavings bags → income
```

A competition is single-field (`competition.fieldid`, verified: only fields 1–4 have competitions, each grouped to one field), so there is no cross-field horse dedup — the whole horse/stall derivation runs against one `maxhorseclassesperday`.

## Surface — one page, three tabs

| Tab | Hebrew | Availability | Content |
|-----|--------|--------------|---------|
| 1. Projection | תחזית | Always (works with zero real entries) | Three separate ranges: entry · stall · shavings income, plus the shavings **bag-order** quantity. Paid time excluded. |
| 2. Actual | בפועל | Post-registration only | Running totals from Active entries × class cost and real bookings. Renames the existing "סה״כ הכנסות צפויות". |
| 3. Projection vs. Actual | תחזית מול בפועל | Once actuals exist | Reliability scorecard, computed Tab 1 − Tab 2. |

Tabs 2 and 3 are **grayed out with a stated reason** before they apply — never hidden, never silent.

## Derivation Model (Tab 1 — the load-bearing contract)

All inputs are read live; nothing below is persisted.

**Per-competition inputs**
- `D` = competition length in days = `(competitionenddate − competitionstartdate) + 1`.
- `f` = `competition.fieldid`; `N` = `fieldconfig.maxhorseclassesperday(f)`.
- Per class `c` **with a prediction row**: entry band `[e_lo(c), e_hi(c)] = [max(0, predicted − rmse), predicted + rmse]`, sourced from `usp_GetEntryPredictionsByCompetitionId` (predicted + rmse per row; band built at read time, never stored). `cost(c) = organizercost + federationcost`, sourced from `usp_GetClassesByCompetitionId`. `day(c) = date(classdatetime)`.

**Entry income**
- `entryIncomeLo = Σ_c e_lo(c) · cost(c)` ; `entryIncomeHi = Σ_c e_hi(c) · cost(c)`.
- A class whose cost is NULL contributes 0 **and** increments a `pricesMissingCount` advisory (never a silent understatement). A class with no prediction row is omitted and increments `unpredictedCount` (per-row degrade, as in Phase 6).

**Per-day horses → horse-days → unique horses** *(resolves residual 1)*
- Per day `d`: `E_lo(d) = Σ_{c on d} e_lo(c)`, `E_hi(d) = Σ_{c on d} e_hi(c)`.
- `H_lo(d) = ceil(E_lo(d) / N)`, `H_hi(d) = ceil(E_hi(d) / N)` — a horse absorbs up to `N` classes of this field per day, so `ceil(entries / N)` is the fewest horses that produce that day's entries.
- Horse-days: `HD_lo = Σ_d H_lo(d)`, `HD_hi = Σ_d H_hi(d)`.
- Unique competition horses (the cross-day dedup):
  - `D ≥ 2` → `uniqueLo = ceil(HD_lo / D)`, `uniqueHi = ceil(HD_hi / (D − 1))`.
  - `D = 1` → `uniqueLo = HD_lo`, `uniqueHi = HD_hi` (no cross-day reuse is possible; band collapses to the single day).
- Meaning: dividing horse-days by `D` assumes every horse is present all `D` days (maximum reuse → fewest horses → low band); dividing by `D − 1` assumes each horse is present `D − 1` days (more horses → high band). This is the horse-days arithmetic that replaces the loose "D or D−1" endpoints in the handoff. **Duration is consumed exactly here, once** — it must not reappear as a price multiplier (see stall income).

**Stalls + tier split**
- Total horse-stalls band `[uniqueLo, uniqueHi]`, each capped at DK supply `128 + 61 = 189`; a value hitting the cap raises an `atCapacity` flag.
- Low income endpoint fills **regular first**: `regLo = min(uniqueLo, 128)`, `upgLo = min(max(uniqueLo − 128, 0), 61)`.
- High income endpoint fills **upgraded first**: `upgHi = min(uniqueHi, 61)`, `regHi = min(max(uniqueHi − 61, 0), 128)`.

**Tack stalls** *(resolves residual 4)*
- `tackLo = floor(uniqueLo / tackHorsesPerUnitMax)` (default 5); `tackHi = ceil(uniqueHi / tackHorsesPerUnitMin)` (default 3) → 1 tack stall per 3–5 horses.
- Tack stalls hold **no horse** (`stallbooking.isfortack = true` has `horseid = NULL`, verified). They bill at the **regular** stall price, add to stall income, consume regular-tier supply, and receive **no shavings**.
- The ratio is read from `smartconfig` keys `tackstallhorsesperunitmin` / `...max` when present, else the 3/5 defaults (tolerant-of-missing-key, as the schedule proc already is). It is surfaced as its own explicitly low-confidence component — never folded silently into the stall number.

**Stall income** (flat per-booking price; duration already consumed above)
- `stallIncomeLo = regLo · stallRegularPrice + upgLo · stallUpgradedPrice + tackLo · stallRegularPrice`
- `stallIncomeHi = regHi · stallRegularPrice + upgHi · stallUpgradedPrice + tackHi · stallRegularPrice`

**Shavings** *(resolves residual 3)* — bags are for **horse** stalls only (regular + upgraded), never tack.
- `bagsLo = (regLo + upgLo) · shavingsBagsMin` (=2); `bagsHi = (regHi + upgHi) · shavingsBagsMax` (=3).
- **Operational output** = the bag-order quantity band `[bagsLo, bagsHi]` — always shown, even when price is absent or ambiguous, because ordering does not need a price.
- `shavingsIncomeLo = bagsLo · shavingsPriceMin`; `shavingsIncomeHi = bagsHi · shavingsPriceMax`.
- Price is `MIN`/`MAX` of `itemprice` over **active** (`isactive = true`) category-3 rows for the ranch. Exactly one active product → `min = max` → band comes from the bag count alone. More than one active (the live bug: products 5 @40 and 10 @50 both active at DK, verified) → `[40, 50]` widens it, plus a soft "pricing ambiguous — select a bag product" note. The formula is forward-compatible with the bug fix without depending on it.

**Empty-pricing state** *(resolves residual 2)*
- The three bands degrade **independently**. Entry income is ranch-independent (costs live on the class) and always renders.
- No active category-2 (stall) price for the ranch → stall income band renders the prompt, **never 0**. No active category-3 (shavings) price → shavings income renders the prompt, but the bag-order quantity still shows.
- Ranch 49 (Green Fields) is the live precedent: 0 pricecatalog rows **and** 0 stalls (verified) → stall and shavings bands both show the prompt; the projection tab is still useful via its entry band.
- Prompt copy: `מחירון לא הוגדר עבור החווה — עדכנו מחירי תאים ונסורת כדי לקבל תחזית`.
- Discriminator: a **missing** active price row → prompt; a **present** row priced 0 → renders ₪0 (a real, if unusual, value). Absence and zero are never conflated.

## Boundaries & Constraints

**Always:**
- Every figure is a labelled **projection** and a **range** (`בערך, בין X ל-Y`), never a point dressed as an accounting total.
- Each of the three bands shows its own assumption and its own width; a tight entry band beside a wide stall band is the honesty, not a defect.
- All derivation is read-time. No new stored column, no cache table. The only new persisted rows permitted are config (`smartconfig` tack keys, optional `fieldconfig` rows for fields 5/6) — config, not derived results.
- Entry income sources costs from `usp_GetClassesByCompetitionId`; entry bands from `usp_GetEntryPredictionsByCompetitionId`. Reuse, do not re-predict.
- Pricing reads filter `isactive = true` (several products carry duplicate active/inactive rows, verified — an unfiltered read double-counts).
- Duration (`D`/`D−1`) enters the math exactly once, as the horse-days divisor. It is never also applied as a per-night price multiplier.
- New Hebrew strings are recorded verbatim in a strings file in the same change that introduces them (Phase 7 convention).
- SQL written here is a repo file plus a deployment request. Never assume it is live.

**Ask First:**
- Any live DB write — the new financial-config proc, the optional `fieldconfig` rows for jumping(5)/dressage(6), and the `smartconfig` tack keys. Show exact SQL, wait for approval.
- Any new user-facing Hebrew string (Oren approves copy before it lands).
- The rename of the existing "סה״כ הכנסות צפויות" figure — confirm the new label and every surface that reads it.

**Never:**
- Do **not** add yearly income projections, most-profitable class/field/period analytics, or expansion-opportunity analytics — explicit next phase.
- Do **not** include paid time in the income projection (not entry-derived, ~always fully booked, essentially reining-only).
- Do **not** show a standalone stall count as its own number — stalls appear only inside stall income (and tack inside it).
- Do **not** count prize money (`classprize.prizeamount`) as income — it is paid out.
- Do **not** give jumping(5)/dressage(6) `fieldconfig` rows with non-NULL minute columns — that would regress the schedule exemption (see footgun below).
- Do **not** touch the schedule minutes columns, the reining flattening gate, or the min/max switcher semantics.

## Footgun — schedule exemption keys off NULL minutes, confirmed

Grepped the full schedule read-path (`usp_getscheduleconfigbyfieldid` → `ScheduleConfigDAL.cs` → `classSchedule.utils.js` → `useSecretaryCompetitionClassesPage.js`):
- The proc `LEFT JOIN`s `fieldconfig` and selects only `minutesperentrymin`/`max` (never `maxhorseclassesperday`).
- `getMinutesPerEntry` returns `null` on NULL minutes → `isScheduleExempt` → `showScheduleColumns = false` and `computeScheduleColumn` returns `null`. **Nothing in the read-path reads `maxhorseclassesperday`** (verified: zero matches for that column across `*.cs/*.js/*.jsx/*.sql`).
- Live precedent: all-around (field 3) has a `fieldconfig` row with `maxhorseclassesperday = 5`, NULL minutes, and a `notes` field literally reading `NULL minutes = exempt from scheduling recommendations` — and is correctly schedule-exempt today.

**Consequences for this phase:**
- The financial layer keys off `maxhorseclassesperday`, present for all four live fields (reining 1 · cutting 3 · all-around 5 · extreme 5). It is therefore **independent of the schedule exemption** — all-around gets stall/income math despite having no schedule.
- Jumping(5)/dressage(6) have **zero competitions** today, so adding their `fieldconfig` rows is purely forward-looking, off the critical path. If added, the minute columns **must stay NULL** and the migration **must** carry a guard comment.
- **Stale comment to correct:** `165_usp_GetScheduleConfigByFieldId.sql` lines 2–4 claim fields 3/5/6 are exempt "by those fields having no fieldconfig row at all." That is false for field 3 (it has a row) and contradicts the resolved mechanism. Correct the comment to state the exemption keys off NULL minutes, not row absence — a repo-only doc fix (file comments never reach live), no redeploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Zero real entries, predictions exist | pre-registration | Tab 1 renders full projection; Tabs 2 & 3 grayed with reason |
| Reining (N=1), day has 10 predicted entries | field 1 | `H = ceil(10/1) = 10` horses that day |
| Cutting (N=3), day has 10 predicted entries | field 2 | `H = ceil(10/3) = 4` horses that day |
| 3-day competition, HD_lo=30 / HD_hi=45 | D=3 | `uniqueLo = ceil(30/3) = 10`, `uniqueHi = ceil(45/2) = 23` |
| Single-day competition | D=1 | band = that day's horse band; no division by `D−1` |
| Unique horses exceed DK supply | uniqueHi = 250 | stalls clamp at 189, `atCapacity` flag raised |
| Tier split, uniqueLo=140 | 128 reg / 61 upg | low: reg 128 + upg 12; income uses cheapest-first fill |
| Tack, 12 horses | ratio 3–5 | tack band `[floor(12/5)=2, ceil(12/3)=4]`, billed at regular price, no shavings |
| Two active shavings products | products 5 @40, 10 @50 both active | price band [40,50]; income widened; "pricing ambiguous" note |
| One active shavings product | single active row @45 | price point 45; band comes from bag count only |
| Host ranch has no stall price | ranch 49 | stall band → prompt copy, never ₪0; entry band still renders |
| Host ranch has no shavings price | ranch 49 | shavings income → prompt; bag-order quantity still shows |
| Class with NULL cost | 1 of N classes | contributes 0 to entry income; `pricesMissingCount` advisory shown |
| Class with no prediction row | mixed | omitted from projection; `unpredictedCount` advisory shown |
| Price row present, priced 0 | stall @0 | renders ₪0 (real value), not the prompt |

</frozen-after-approval>

## Code Map

*(Greenfield — files to create unless noted. Concrete shapes, not prescriptions; adjust at implementation if a read is better merged.)*

- `RideOnDB/StoredProcedures/PostgreSQL/Individual/<next>_usp_GetFinancialConfigForCompetition.sql` — **new.** Input `p_competitionid`. Returns one scalar row: `ranchid`, `competitiondays` (D), `fieldid`, `maxhorseclassesperday`, `stallregularprice`/`stallupgradedprice` (active category-2), `stallregularsupply`/`stallupgradedsupply` (COUNT over `stall` by type for the ranch), `shavingspricemin`/`shavingspricemax` + `shavingsactivecount` (MIN/MAX/COUNT over active category-3), `shavingsbagsmin`/`shavingsbagsmax` (smartconfig), `tackhorsesperunitmin`/`max` (smartconfig, default 3/5). Missing prices come back NULL → frontend renders the prompt. Follow the `p_*` param / lowercase-unquoted-return convention of the Smart Element proc family (160–165).
- `RideOnServer/BL/DTOs/Financial/FinancialConfig.cs` + `RideOnServer/DAL/FinancialConfigDAL.cs` — **new.** DTO + reader-by-column-name, mirroring `ScheduleConfig.cs` / `ScheduleConfigDAL.cs` exactly.
- `RideOnServer/Controllers/*` — **new** endpoint returning the financial config for a competition (auth via `UserAccessValidator.EnsureUserHasRoleInRanch`, secretary role, matching the schedule-config endpoint).
- `RideOnServer/DAL/EntryPredictionDAL.cs` — **reuse** `GetPredictionsByCompetitionId` (entry bands). No change.
- `usp_GetClassesByCompetitionId` (`16_...sql`) — **reuse**; already returns `OrganizerCost`/`FederationCost` per class (verified). No change.
- `RideOnClient/rideon-client/web/src/services/financialConfigService.js` — **new.** Fetch wrapper, mirroring `scheduleConfigService.js`.
- `RideOnClient/rideon-client/web/src/utils/financialProjection.utils.js` — **new.** Pure read-time derivation implementing the model above; the analogue of `classSchedule.utils.js`. Unit-tested.
- `RideOnClient/rideon-client/web/src/components/secretary/classes/FinancialProjectionTabs.jsx` (+ per-tab panels) — **new.** Three-tab surface mirroring `SecretaryClassesViewTabs.jsx`; grayed-with-reason states for Tabs 2/3.
- `RideOnClient/rideon-client/web/src/hooks/secretary/useSecretaryCompetitionClassesPage.js` — **edit.** Wire the financial-config fetch and expose the derived projection, alongside the existing schedule/prediction wiring.
- Existing "סה״כ הכנסות צפויות" surface — **edit/rename** so Tab 2's actual total stops colliding with Tab 1's projection.
- `165_usp_GetScheduleConfigByFieldId.sql` — **edit (comment only).** Correct the stale exemption comment (lines 2–4).
- `.../fieldconfig` rows for fields 5/6 — **optional migration**, NULL minutes + guard comment. Deferred until a jumping/dressage competition exists.
- Hebrew strings file — **new/append.** The prompt copy, tab labels, band labels, ambiguity note, advisories.

## Tasks & Acceptance

**Execution:**
- [ ] `usp_GetFinancialConfigForCompetition.sql` — one scalar-row config read; NULL prices for un-priced ranches; `isactive = true` filter on pricing; smartconfig by key with tack-key defaults
- [ ] `FinancialConfig.cs` + `FinancialConfigDAL.cs` + controller endpoint — mirror the schedule-config trio; secretary ranch-role auth
- [ ] `financialConfigService.js` — fetch wrapper mirroring `scheduleConfigService.js`
- [ ] `financialProjection.utils.js` — implement the full Derivation Model as pure functions; entry / stall / shavings bands + bag-order quantity + tack + empty-pricing + ambiguity states
- [ ] `FinancialProjectionTabs.jsx` (+ panels) — three tabs; Tabs 2/3 grayed with a stated reason; every figure labelled a projection range
- [ ] `useSecretaryCompetitionClassesPage.js` — wire the financial-config fetch and expose the derived projection
- [ ] Rename the existing "סה״כ הכנסות צפויות" figure — update every reading surface
- [ ] `165_usp_GetScheduleConfigByFieldId.sql` — correct the stale exemption comment (repo-only)
- [ ] Hebrew strings file — record the prompt copy, labels, and advisories verbatim
- [ ] `financialProjection.utils.test.js` — pin every I/O matrix row (horse-days arithmetic, tier fill, tack, empty pricing, ambiguity, NULL cost, capacity clamp)
- [ ] *(Optional / deferred)* `fieldconfig` rows for fields 5/6 with NULL minutes + guard comment — only when a jumping/dressage competition is created

**Acceptance Criteria:**
- Given a competition with predictions and zero real entries, when Tab 1 renders, then three labelled income ranges and a bag-order quantity appear, and Tabs 2/3 are grayed with a reason.
- Given a host ranch with no active stall/shavings prices (ranch 49), when Tab 1 renders, then stall and shavings bands show the prompt copy and never ₪0, while the entry band renders normally.
- Given two active shavings products at the ranch, when Tab 1 renders, then the shavings band spans the two prices and an ambiguity note is shown; given exactly one, the band derives from the bag count alone.
- Given a `D`-day competition, when horses are derived, then unique horses = `ceil(horse-days / D)` .. `ceil(horse-days / (D−1))` (and the single-day band when `D = 1`), with duration applied nowhere else.
- Given `dotnet build` after the `.cs` changes, then 0 errors and the new files warning-free.
- Given the schedule read-path after this phase, then it is byte-for-byte unchanged in behavior (only proc 165's comment differs), and all-around still renders no schedule columns while gaining a financial projection.

## Design Notes

**Why the financial layer is independent of the schedule exemption.** It reads `maxhorseclassesperday`, which every live field has, rather than the minute columns that gate the schedule. All-around is the proof: schedule-exempt, yet fully stall-projectable. This is why the fieldconfig footgun does not threaten this phase — the two features read different columns of the same row.

**Why horse-days, not summed per-day horses.** A stall is one horse for the whole event (verified: multi-day bookings, spans clustering at `D`/`D−1`). Summing per-day horse counts double-counts every returning horse. Converting to horse-days and dividing by per-horse attendance (`D` or `D−1`) deduplicates honestly and, as a bonus, makes the handoff's "D or D−1" endpoints rigorous: they are the divisor, not a separate multiplier. Applying them again to price would double-count duration — hence the flat per-booking stall price.

**Why the tack ratio is config-sourced with a default.** The 1-per-3–5 rests on a 7/23 booking sample (verified thin). Putting it in `smartconfig` (mirroring `shavingsperstallmin/max`) lets it be retuned from fuller `stallbooking` history with no code change, and the 3/5 default keeps the feature working before the keys exist. It is shown as its own low-confidence line so a wrong ratio is visible, not buried. Pre-implementation, a validation query of tack-to-horse ratio across past competitions is worth running (owner: data-scientist) before trusting it.

**Why absence ≠ zero.** A missing price and a ₪0 price are different facts; conflating them would tell a ranch owner they will earn nothing when the truth is they have not set a price. The read distinguishes "no active row" (prompt) from "row priced 0" (₪0). Ranch 49 exercises this today.

**Deferred, flagged not fixed.** The two-active-shavings-products bug is a real data defect (QA-tracked); this spec models around it with the 40–50 range and stays forward-compatible, but does not fix it. The declarative-exemption cleanup (per-field boolean columns on `fieldconfig` instead of the reining literal and the NULL-minutes convention) remains the cleaner long-term shape Phase 7 already flagged — still out of scope.

## Verification

**Commands:**
- `cd RideOnServer && dotnet build` — expected: 0 errors; new DAL/DTO/controller files warning-free.
- `cd RideOnClient/rideon-client/web && npm run lint` — expected: no new findings in touched files.
- `cd RideOnClient/rideon-client/web && npm test` — expected: `financialProjection.utils.test.js` green across the I/O matrix.

**Live DB (read-only, before deploy):**
- Re-confirm active pricing for the target ranch with `isactive = true` (DK: reg 150, upg 200, shavings {40, 50}; ranch 49: empty).
- Confirm `fieldconfig` unchanged for fields 1–4 and no non-NULL minutes anywhere except 1/2/4.
- Call `usp_GetScheduleConfigByFieldId` across all fieldids after any 5/6 addition; gap/minute columns must stay NULL for every field except reining's gap columns.

**Manual checks:**
- A DK competition with predictions: read `predictedentries`/`rmse` for its classes and the config row; hand-derive one band endpoint and match it to the rendered figure (positive-path, per the three-path verification for silent read features).
- A ranch-49 competition: confirm the prompt renders for stall + shavings and the entry band renders normally.

## Suggested Review Order

**The derivation — start here**
- The horse-days reconciliation and the single-day guard are the spec's core claim; everything downstream (stalls, tack, shavings) hangs off `uniqueLo`/`uniqueHi`. Review the Derivation Model section first, then `financialProjection.utils.js`.

**The footgun**
- Confirm the financial read never touches the schedule minute columns and that adding 5/6 rows with NULL minutes leaves the schedule read-path inert (the all-around precedent).

**Empty-pricing and ambiguity**
- The ranch-49 prompt path and the two-active-shavings band are where a silent zero or a false single-price would slip in; review the discriminator (missing row vs 0-priced row) and the `isactive = true` filter.

**Peripherals**
- Tab 2/3 grayed-with-reason states; the "סה״כ הכנסות צפויות" rename and every surface that reads it.
